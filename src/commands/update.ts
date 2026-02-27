import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { detectInstall, scanDir, compareConfigs, ensureDir, computeFileHashes, aggregateToAgentsMd } from '../utils/files.js';
import crypto from 'crypto';
import { updateRepo } from '../utils/git.js';
import type { DotrulesMeta } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, '../..');

export interface UpdateOptions {
  force?: boolean;      // Overwrite all files
  addOnly?: boolean;    // Add new files only
  interactive?: boolean; // Select per file
}

export async function update(options: UpdateOptions = {}): Promise<void> {
  const install = detectInstall();

  if (!install) {
    console.log('\n❌ No ai-nexus installation found.');
    console.log('   Run "ai-nexus init" or "ai-nexus install" first.\n');
    process.exit(1);
  }

  const { configPath, scope } = install;
  const scopeLabel = scope === 'global' ? 'Global' : 'Project';

  console.log(`\n🔄 Updating ${scopeLabel} rules (${configPath})\n`);

  // Read metadata
  const metaPath = path.join(configPath, 'meta.json');
  if (!fs.existsSync(metaPath)) {
    console.log('❌ No metadata found. Please reinstall.\n');
    process.exit(1);
  }

  const meta: DotrulesMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  console.log(`   Sources: ${(meta.sources ?? []).map(s => s.name).join(', ')}\n`);

  const configDir = path.join(configPath, 'config');
  const targetDir = scope === 'global' ? os.homedir() : process.cwd();
  const claudeDir = path.join(targetDir, '.claude');

  // Migrate from symlink if needed
  if (meta.mode === 'symlink') {
    migrateFromSymlink(claudeDir, meta, metaPath);
  }

  let hasChanges = false;

  // Step 1: Sync new builtin files to .ai-nexus/config/
  const builtinConfigDir = path.join(PACKAGE_ROOT, 'config');
  const categories = ['rules', 'commands', 'skills', 'agents', 'contexts', 'hooks'];
  let builtinAdded = 0;

  for (const category of categories) {
    const srcDir = path.join(builtinConfigDir, category);
    if (!fs.existsSync(srcDir)) continue;

    const destDir = path.join(configDir, category);
    ensureDir(destDir);

    const srcFiles = scanDir(srcDir);
    for (const [rel, content] of Object.entries(srcFiles)) {
      const dest = path.join(destDir, rel);
      if (!fs.existsSync(dest)) {
        ensureDir(path.dirname(dest));
        fs.writeFileSync(dest, content);
        builtinAdded++;
      }
    }
  }

  if (builtinAdded > 0) {
    console.log(chalk.green(`   + ${builtinAdded} new builtin files synced`));
    hasChanges = true;
  }

  // Step 2: Update external sources and re-merge new files
  const sourcesDir = path.join(configPath, 'sources');

  for (const source of (meta.sources ?? [])) {
    if (source.type === 'external' && source.url) {
      const repoPath = path.join(sourcesDir, source.name);
      console.log(`   📥 Updating ${source.name}...`);

      if (fs.existsSync(repoPath)) {
        const updated = updateRepo(repoPath);
        if (updated) {
          console.log(`      ✓ Updated`);
          hasChanges = true;
        } else {
          console.log(`      - Already up to date`);
        }

        // Re-merge new files from external source to config
        const externalConfigDir = fs.existsSync(path.join(repoPath, 'config'))
          ? path.join(repoPath, 'config')
          : repoPath;

        let extAdded = 0;
        for (const category of categories) {
          const srcCat = path.join(externalConfigDir, category);
          if (!fs.existsSync(srcCat)) continue;

          const destCat = path.join(configDir, category);
          ensureDir(destCat);

          const srcFiles = scanDir(srcCat);
          for (const [rel, content] of Object.entries(srcFiles)) {
            const prefixed = `${source.name}-${path.basename(rel)}`;
            const destRel = path.join(path.dirname(rel), prefixed);
            const dest = path.join(destCat, destRel === prefixed ? prefixed : destRel);
            if (!fs.existsSync(dest)) {
              ensureDir(path.dirname(dest));
              fs.writeFileSync(dest, content);
              extAdded++;
            }
          }
        }

        if (extAdded > 0) {
          console.log(chalk.green(`      + ${extAdded} new files from ${source.name}`));
          hasChanges = true;
        }
      }
    }
  }

  // Step 3: Compare .ai-nexus/config vs .claude/ and sync
  // Only compare files within tracked categories — exclude settings.json,
  // rules-inactive/ (managed by semantic router), and any other untracked files.
  const TRACKED_CATEGORIES = ['rules', 'commands', 'skills', 'agents', 'contexts', 'hooks'];
  const sourceFiles = scanDir(configDir);
  const allInstalledFiles = scanDir(claudeDir);
  const installedFiles = Object.fromEntries(
    Object.entries(allInstalledFiles).filter(([rel]) =>
      TRACKED_CATEGORIES.some(cat => rel.startsWith(cat + '/') || rel.startsWith(cat + '\\'))
    )
  ) as typeof allInstalledFiles;
  const diff = compareConfigs(sourceFiles, installedFiles);

  if (diff.added.length === 0 && diff.modified.length === 0 && diff.removed.length === 0) {
    if (!hasChanges) {
      console.log('\n✅ Already up to date!\n');
      return;
    }
  } else {
    console.log('\n   Changes detected:');
    if (diff.added.length > 0) console.log(chalk.green(`   + ${diff.added.length} new files`));
    if (diff.modified.length > 0) console.log(chalk.yellow(`   ~ ${diff.modified.length} modified files`));
    if (diff.removed.length > 0) console.log(chalk.red(`   - ${diff.removed.length} removed in source`));
  }

  // Determine which files to update
  const filesToAdd = diff.added;
  let filesToUpdate: string[];
  let filesToRemove: string[] = [];

  if (options.force) {
    const userEdited = detectUserEdits(diff.modified, claudeDir, meta.fileHashes);
    if (userEdited.length > 0) {
      console.log(chalk.red(`\n   WARNING: ${userEdited.length} file(s) have local edits that will be overwritten:`));
      for (const f of userEdited) {
        console.log(chalk.red(`     - ${f}`));
      }

      const { proceed } = await inquirer.prompt<{ proceed: boolean }>([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Overwrite these user-edited files?',
          default: false,
        },
      ]);
      if (!proceed) {
        filesToUpdate = diff.modified.filter(f => !userEdited.includes(f));
      } else {
        filesToUpdate = diff.modified;
      }
    } else {
      filesToUpdate = diff.modified;
    }
    filesToRemove = diff.removed;
  } else if (options.addOnly) {
    filesToUpdate = [];
    filesToRemove = [];
  } else if (options.interactive && diff.modified.length > 0) {
    console.log(chalk.cyan('\n   Modified files (choose which to overwrite):\n'));

    const { selectedFiles } = await inquirer.prompt<{ selectedFiles: string[] }>([
      {
        type: 'checkbox',
        name: 'selectedFiles',
        message: 'Select files to overwrite',
        choices: diff.modified.map(f => ({
          name: f,
          value: f,
          checked: false,
        })),
      },
    ]);
    filesToUpdate = selectedFiles;

    if (diff.removed.length > 0) {
      const { removeFiles } = await inquirer.prompt<{ removeFiles: boolean }>([
        {
          type: 'confirm',
          name: 'removeFiles',
          message: `Remove ${diff.removed.length} files that no longer exist in source?`,
          default: false,
        },
      ]);
      filesToRemove = removeFiles ? diff.removed : [];
    }
  } else {
    filesToUpdate = [];
    filesToRemove = [];

    if (diff.modified.length > 0) {
      console.log(chalk.gray(`\n   Skipping ${diff.modified.length} modified files (use --force to overwrite)`));
    }
  }

  // Apply changes
  let addedCount = 0;
  let updatedCount = 0;
  let removedCount = 0;

  for (const rel of filesToAdd) {
    const src = path.join(configDir, rel);
    const dest = path.join(claudeDir, rel);
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
    addedCount++;
  }

  for (const rel of filesToUpdate) {
    const src = path.join(configDir, rel);
    const dest = path.join(claudeDir, rel);
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
    updatedCount++;
  }

  for (const rel of filesToRemove) {
    const dest = path.join(claudeDir, rel);
    if (fs.existsSync(dest)) {
      fs.unlinkSync(dest);
      removedCount++;
    }
  }

  if (addedCount > 0 || updatedCount > 0 || removedCount > 0) {
    console.log('\n   Applied:');
    if (addedCount > 0) console.log(chalk.green(`   + ${addedCount} files added`));
    if (updatedCount > 0) console.log(chalk.yellow(`   ~ ${updatedCount} files updated`));
    if (removedCount > 0) console.log(chalk.red(`   - ${removedCount} files removed`));
    hasChanges = true;
  }

  // Step 4: Sync hooks to .claude/hooks/ (new files only)
  const hooksConfigDir = path.join(configDir, 'hooks');
  const hooksTargetDir = path.join(claudeDir, 'hooks');
  if (fs.existsSync(hooksConfigDir)) {
    ensureDir(hooksTargetDir);
    let hooksAdded = 0;

    const hookFiles = scanDir(hooksConfigDir);
    for (const [rel, content] of Object.entries(hookFiles)) {
      const dest = path.join(hooksTargetDir, rel);
      if (!fs.existsSync(dest)) {
        ensureDir(path.dirname(dest));
        fs.writeFileSync(dest, content);
        hooksAdded++;
      }
    }

    if (hooksAdded > 0) {
      console.log(chalk.green(`   + ${hooksAdded} new hooks added`));
      hasChanges = true;
    }
  }

  // Regenerate AGENTS.md for Codex
  if (meta.tools && meta.tools.includes('codex')) {
    const codexDir = path.join(targetDir, '.codex');
    const destAgents = path.join(codexDir, 'AGENTS.md');
    const content = aggregateToAgentsMd(configDir);

    if (fs.existsSync(destAgents)) {
      const existing = fs.readFileSync(destAgents, 'utf8');
      if (existing !== content) {
        if (options.force) {
          ensureDir(codexDir);
          fs.writeFileSync(destAgents, content);
          console.log(chalk.green('   ✓ Codex AGENTS.md regenerated'));
          hasChanges = true;
        } else {
          console.log(chalk.gray('   Codex AGENTS.md has changes (use --force to regenerate)'));
        }
      }
    } else {
      ensureDir(codexDir);
      fs.writeFileSync(destAgents, content);
      console.log(chalk.green('   ✓ Codex AGENTS.md generated'));
      hasChanges = true;
    }
  }

  // Update metadata
  meta.updatedAt = new Date().toISOString();
  delete meta.mode; // remove deprecated field
  meta.fileHashes = computeFileHashes(claudeDir);
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  if (hasChanges) {
    console.log('\n✅ Update complete!\n');
  } else {
    console.log('\n✅ Already up to date!\n');
  }
}

function migrateFromSymlink(claudeDir: string, meta: DotrulesMeta, metaPath: string): void {
  console.log(chalk.yellow('   ⚡ Migrating from symlink to copy mode...\n'));

  const categories = ['rules', 'commands', 'skills', 'agents', 'contexts'];
  let migrated = 0;

  for (const category of categories) {
    const targetPath = path.join(claudeDir, category);
    if (!fs.existsSync(targetPath)) continue;

    try {
      const stat = fs.lstatSync(targetPath);
      if (!stat.isSymbolicLink()) continue;

      // Read files through symlink before removing it
      const files = scanDir(targetPath);

      // Remove symlink
      fs.unlinkSync(targetPath);

      // Create directory and copy files
      ensureDir(targetPath);
      for (const [rel, content] of Object.entries(files)) {
        const dest = path.join(targetPath, rel);
        ensureDir(path.dirname(dest));
        fs.writeFileSync(dest, content);
      }

      migrated++;
    } catch {
      // Skip on error
    }
  }

  // Update meta
  delete meta.mode;
  meta.fileHashes = computeFileHashes(claudeDir);
  meta.updatedAt = new Date().toISOString();
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  if (migrated > 0) {
    console.log(chalk.green(`   ✓ Migrated ${migrated} symlinks to copies\n`));
  }
}

function detectUserEdits(
  modifiedFiles: string[],
  claudeDir: string,
  savedHashes?: Record<string, string>,
): string[] {
  if (!savedHashes) return [];

  const userEdited: string[] = [];
  for (const rel of modifiedFiles) {
    const filePath = path.join(claudeDir, rel);
    if (!fs.existsSync(filePath)) continue;

    const currentHash = crypto
      .createHash('md5')
      .update(fs.readFileSync(filePath))
      .digest('hex');

    const originalHash = savedHashes[rel];
    if (originalHash && currentHash !== originalHash) {
      userEdited.push(rel);
    }
  }
  return userEdited;
}
