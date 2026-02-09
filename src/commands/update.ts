import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { detectInstall, scanDir, compareConfigs, ensureDir } from '../utils/files.js';
import { updateRepo } from '../utils/git.js';

interface DotrulesMeta {
  version: string;
  mode: 'symlink' | 'copy';
  sources: Array<{
    name: string;
    url?: string;
    type: 'builtin' | 'external';
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOptions {
  force?: boolean;      // 모든 파일 덮어쓰기
  addOnly?: boolean;    // 새 파일만 추가
  interactive?: boolean; // 파일별로 선택
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
    ? require('os').homedir()
    : process.cwd();
  const claudeDir = path.join(targetDir, '.claude');

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
    let filesToAdd = diff.added;
    let filesToUpdate: string[] = [];
    let filesToRemove: string[] = [];

    if (options.force) {
      // Force mode: update everything
      filesToUpdate = diff.modified;
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

  // Update metadata
  meta.updatedAt = new Date().toISOString();
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  if (hasChanges || meta.mode === 'symlink') {
    console.log('\n✅ Update complete!\n');
  } else {
    console.log('\n✅ Already up to date!\n');
  }
}
