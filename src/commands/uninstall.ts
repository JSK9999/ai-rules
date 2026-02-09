import fs from 'fs';
import path from 'path';
import os from 'os';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { detectInstall } from '../utils/files.js';

export interface UninstallOptions {
  force?: boolean;
  global?: boolean;
  project?: boolean;
}

export async function uninstall(options: UninstallOptions = {}): Promise<void> {
  const install = detectInstall();

  if (!install && !options.global && !options.project) {
    console.log('\n❌ No ai-rules installation found.\n');
    return;
  }

  // Determine scope
  let scope: 'global' | 'project' | 'both' = 'both';
  if (options.global) scope = 'global';
  if (options.project) scope = 'project';

  const targets: Array<{ path: string; label: string; scope: string }> = [];

  // Global paths
  if (scope === 'global' || scope === 'both') {
    const home = os.homedir();
    const globalPaths = [
      { path: path.join(home, '.ai-rules'), label: '.ai-rules', scope: 'global' },
      { path: path.join(home, '.claude'), label: '.claude', scope: 'global' },
      { path: path.join(home, '.codex'), label: '.codex', scope: 'global' },
      { path: path.join(home, '.cursor'), label: '.cursor', scope: 'global' },
    ];
    for (const p of globalPaths) {
      if (fs.existsSync(p.path)) {
        targets.push(p);
      }
    }
  }

  // Project paths
  if (scope === 'project' || scope === 'both') {
    const cwd = process.cwd();
    const projectPaths = [
      { path: path.join(cwd, '.ai-rules'), label: '.ai-rules', scope: 'project' },
      { path: path.join(cwd, '.claude'), label: '.claude', scope: 'project' },
      { path: path.join(cwd, '.codex'), label: '.codex', scope: 'project' },
      { path: path.join(cwd, '.cursor'), label: '.cursor', scope: 'project' },
    ];
    for (const p of projectPaths) {
      if (fs.existsSync(p.path)) {
        targets.push(p);
      }
    }
  }

  if (targets.length === 0) {
    console.log('\n✅ Nothing to uninstall.\n');
    return;
  }

  console.log(chalk.yellow('\n⚠️  The following directories will be removed:\n'));

  for (const target of targets) {
    const scopeLabel = target.scope === 'global' ? '(global)' : '(project)';
    console.log(`   ${chalk.red('•')} ${target.path} ${chalk.gray(scopeLabel)}`);
  }

  console.log('');

  if (!options.force) {
    const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'Are you sure you want to uninstall?',
        default: false,
      },
    ]);

    if (!confirmed) {
      console.log(chalk.gray('\nCancelled.\n'));
      return;
    }
  }

  // Remove directories
  let removed = 0;
  for (const target of targets) {
    try {
      fs.rmSync(target.path, { recursive: true, force: true });
      console.log(chalk.green(`   ✓ Removed ${target.label}`));
      removed++;
    } catch (error) {
      console.log(chalk.red(`   ✗ Failed to remove ${target.label}: ${error}`));
    }
  }

  console.log(chalk.green(`\n✅ Uninstalled ${removed} directories.\n`));
}
