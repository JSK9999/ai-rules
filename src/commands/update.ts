import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { detectInstall, scanDir, compareConfigs, ensureDir, computeFileHashes, aggregateToAgentsMd } from '../utils/files.js';
import crypto from 'crypto';
import { updateRepo } from '../utils/git.js';
import type { DotrulesMeta } from '../types.js';

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
  console.log(`   Mode: ${meta.mode}`);
  console.log(`   Sources: ${meta.sources.map(s => s.name).join(', ')}\n`);

  // Update external sources
  let hasChanges = false;
  const sourcesDir = path.join(configPath, 'sources');

  for (const source of meta.sources) {
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
      }
    }
  }

  // Sync config to .claude/
  const configDir = path.join(configPath, 'config');
  const targetDir = scope === 'global'
    ? os.homedir()
    : process.cwd();
  const claudeDir = path.join(targetDir, '.claude');

  if (meta.mode === 'symlink') {
    const hasExternal = meta.sources.some(s => s.type === 'external');
    if (!hasExternal && !hasChanges) {
      console.log(chalk.gray('  Symlink mode with built-in rules only.'));
      console.log(chalk.gray('  Built-in rules update when you run:'));
      console.log(chalk.bold('    npm update -g ai-nexus\n'));
    }
  }

  if (meta.mode === 'copy') {
    // Copy mode: compare and update files
    const sourceFiles = scanDir(configDir);
    const installedFiles = scanDir(claudeDir);
    const diff = compareConfigs(sourceFiles, installedFiles);

    if (diff.added.length === 0 && diff.modified.length === 0 && diff.removed.length === 0) {
      console.log('\n✅ Already up to date!\n');
      return;
    }

    console.log('\n   Changes detected:');
    if (diff.added.length > 0) console.log(chalk.green(`   + ${diff.added.length} new files`));
    if (diff.modified.length > 0) console.log(chalk.yellow(`   ~ ${diff.modified.length} modified files`));
    if (diff.removed.length > 0) console.log(chalk.red(`   - ${diff.removed.length} removed in source`));

    // Determine which files to update
    const filesToAdd = diff.added;
    let filesToUpdate: string[];
    let filesToRemove: string[] = [];

    if (options.force) {
      // Force mode: update everything, but warn about user-edited files
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
      // Add-only mode: only add new files
      filesToUpdate = [];
      filesToRemove = [];
    } else if (options.interactive && diff.modified.length > 0) {
      // Interactive mode: ask for each modified file
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
      // Default: add new files, skip modified, keep removed
      // (merge mode)
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

  // Update metadata (refresh file hashes for copy mode)
  meta.updatedAt = new Date().toISOString();
  if (meta.mode === 'copy') {
    meta.fileHashes = computeFileHashes(claudeDir);
  }
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  if (hasChanges) {
    console.log('\n✅ Update complete!\n');
  } else {
    console.log('\n✅ Already up to date!\n');
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
