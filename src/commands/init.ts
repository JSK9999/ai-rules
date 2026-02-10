import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import chalk from 'chalk';
import {
  getTargetDir,
  getConfigPath,
  ensureDir,
  copyFile,
  createSymlink,
  scanDir,
} from '../utils/files.js';
import { cloneRepo, getRepoName, normalizeGitUrl } from '../utils/git.js';
import type { DotrulesMeta } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, '../..');
const require = createRequire(import.meta.url);

interface InitOptions {
  scope: 'project' | 'global';
  rules?: string;
  copy?: boolean;
}

interface InstallResult {
  name: string;
  action: 'symlink' | 'copied' | 'skipped';
  fileCount?: number;
}

export async function init(options: InitOptions): Promise<void> {
  const { scope, rules: rulesUrl, copy: copyMode } = options;
  const targetDir = getTargetDir(scope);
  const aiRulesDir = getConfigPath(scope);
  const configDir = path.join(aiRulesDir, 'config');
  const mode = copyMode ? 'copy' : 'symlink';

  console.log(chalk.bold(`\n  ai-nexus ${scope === 'global' ? 'global' : 'project'} setup\n`));

  // Create .ai-nexus directory
  ensureDir(aiRulesDir);
  ensureDir(configDir);

  const sources: DotrulesMeta['sources'] = [];

  // Handle external rules repository
  if (rulesUrl) {
    console.log(`  Fetching rules from: ${rulesUrl}`);
    const repoName = getRepoName(rulesUrl);
    const repoPath = path.join(aiRulesDir, 'sources', repoName);

    try {
      cloneRepo(rulesUrl, repoPath);
      sources.push({
        name: repoName,
        url: normalizeGitUrl(rulesUrl),
        type: 'external',
      });
      console.log(chalk.green(`  Cloned ${repoName}\n`));

      // Copy/link rules from external repo
      const externalConfigDir = path.join(repoPath, 'config');
      if (fs.existsSync(externalConfigDir)) {
        copyConfigToTarget(externalConfigDir, configDir);
      } else {
        // Try root level if no config/ folder
        copyConfigToTarget(repoPath, configDir);
      }
    } catch (error) {
      console.error(chalk.red(`  Failed to clone: ${error}`));
      process.exit(1);
    }
  } else {
    // Use built-in rules
    const builtinConfigDir = path.join(PACKAGE_ROOT, 'config');
    if (fs.existsSync(builtinConfigDir)) {
      copyConfigToTarget(builtinConfigDir, configDir);
      sources.push({ name: 'builtin', type: 'builtin' });
    }
  }

  // Create symlinks or copy to .claude/
  const claudeDir = path.join(targetDir, '.claude');
  ensureDir(claudeDir);

  const categories = ['rules', 'commands', 'skills', 'agents', 'contexts'];
  const results: InstallResult[] = [];

  for (const category of categories) {
    const sourceDir = path.join(configDir, category);
    const targetPath = path.join(claudeDir, category);

    if (!fs.existsSync(sourceDir)) continue;

    const fileCount = countFiles(sourceDir);

    // Local priority: skip if directory exists and is not a symlink
    if (fs.existsSync(targetPath)) {
      try {
        const stat = fs.lstatSync(targetPath);
        if (!stat.isSymbolicLink()) {
          results.push({ name: category, action: 'skipped', fileCount });
          continue;
        }
        // Remove existing symlink to recreate
        fs.unlinkSync(targetPath);
      } catch (e) {
        // Ignore errors
      }
    }

    if (mode === 'symlink') {
      createSymlink(sourceDir, targetPath);
      results.push({ name: category, action: 'symlink', fileCount });
    } else {
      // Copy mode
      const files = scanDir(sourceDir);
      for (const [rel, content] of Object.entries(files)) {
        const dest = path.join(targetPath, rel);
        ensureDir(path.dirname(dest));
        fs.writeFileSync(dest, content);
      }
      results.push({ name: category, action: 'copied', fileCount });
    }
  }

  // Install hooks
  const hooksSourceDir = path.join(configDir, 'hooks');
  const hooksTargetDir = path.join(claudeDir, 'hooks');
  if (fs.existsSync(hooksSourceDir) || fs.existsSync(path.join(PACKAGE_ROOT, 'config', 'hooks'))) {
    const hooksSource = fs.existsSync(hooksSourceDir)
      ? hooksSourceDir
      : path.join(PACKAGE_ROOT, 'config', 'hooks');

    if (!fs.existsSync(hooksTargetDir)) {
      ensureDir(hooksTargetDir);
      const files = fs.readdirSync(hooksSource);
      for (const file of files) {
        const src = path.join(hooksSource, file);
        const dest = path.join(hooksTargetDir, file);
        if (fs.statSync(src).isFile()) {
          fs.copyFileSync(src, dest);
        }
      }
      results.push({ name: 'hooks', action: 'copied' });
    } else {
      results.push({ name: 'hooks', action: 'skipped' });
    }
  }

  // Install settings.json
  const settingsSource = path.join(PACKAGE_ROOT, 'config', 'settings.json');
  const settingsTarget = path.join(claudeDir, 'settings.json');
  if (fs.existsSync(settingsSource) && !fs.existsSync(settingsTarget)) {
    fs.copyFileSync(settingsSource, settingsTarget);
    results.push({ name: 'settings.json', action: 'copied' });
  } else if (fs.existsSync(settingsTarget)) {
    results.push({ name: 'settings.json', action: 'skipped' });
  }

  // Save metadata
  const meta: DotrulesMeta = {
    version: require(path.join(PACKAGE_ROOT, 'package.json')).version,
    mode,
    sources,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(aiRulesDir, 'meta.json'),
    JSON.stringify(meta, null, 2)
  );

  // Print structured summary
  printSummary(claudeDir, mode, results);
}

function printSummary(
  claudeDir: string,
  mode: string,
  results: InstallResult[],
): void {
  const installed = results.filter(r => r.action !== 'skipped');
  const skipped = results.filter(r => r.action === 'skipped');

  console.log(chalk.green.bold('\n  Setup complete!\n'));
  console.log(`  Location: ${claudeDir}`);
  console.log(`  Mode:     ${mode}\n`);

  // Installed items
  if (installed.length > 0) {
    console.log(chalk.bold('  Installed:'));
    for (const item of installed) {
      const files = item.fileCount ? ` (${item.fileCount} files)` : '';
      console.log(chalk.green(`    + ${item.name}/${files} ${item.action}`));
    }
  }

  // Skipped items
  if (skipped.length > 0) {
    console.log(chalk.bold('\n  Kept as-is (local files preserved):'));
    for (const item of skipped) {
      console.log(chalk.yellow(`    ~ ${item.name}/  (not overwritten)`));
    }
  }

  // Getting started guide
  console.log(chalk.bold('\n  Getting Started:\n'));
  console.log('  1. Enable AI routing (optional but recommended):');
  console.log(chalk.gray('     export ANTHROPIC_API_KEY=sk-ant-...  # or OPENAI_API_KEY'));
  console.log(chalk.gray('     Rules are selected per-prompt. ~$0.50/month.\n'));
  console.log('  2. Verify installation:');
  console.log(chalk.gray('     ai-nexus doctor\n'));
  console.log('  3. See installed rules:');
  console.log(chalk.gray('     ai-nexus list\n'));
  console.log('  4. Test rule selection:');
  console.log(chalk.gray('     ai-nexus test "write a commit message"\n'));
}

function countFiles(dir: string): number {
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      count += countFiles(path.join(dir, entry.name));
    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.cjs')) {
      count++;
    }
  }
  return count;
}

function copyConfigToTarget(sourceDir: string, targetDir: string): void {
  const categories = ['rules', 'commands', 'skills', 'agents', 'contexts'];

  for (const category of categories) {
    const srcCat = path.join(sourceDir, category);
    if (!fs.existsSync(srcCat)) continue;

    const destCat = path.join(targetDir, category);
    ensureDir(destCat);

    const files = scanDir(srcCat);
    for (const [rel, content] of Object.entries(files)) {
      const dest = path.join(destCat, rel);
      ensureDir(path.dirname(dest));
      fs.writeFileSync(dest, content);
    }
  }
}
