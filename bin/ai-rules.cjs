#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const os = require('os');

const VERSION = require('../package.json').version;

program
  .name('ai-rules')
  .description('AI coding assistant rule manager for Claude Code, Codex, and Cursor')
  .version(VERSION);

program
  .command('init')
  .description('Initialize rules in current project (.claude/, .codex/)')
  .option('--rules <url>', 'Git repository URL for rules (e.g., github.com/org/my-rules)')
  .option('--copy', 'Copy files instead of symlink')
  .option('-i, --interactive', 'Use interactive mode with file selection')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .action(async (options) => {
    if (options.interactive) {
      const { initInteractive } = await import('../dist/commands/init-interactive.js');
      await initInteractive();
    } else {
      const { init } = await import('../dist/commands/init.js');
      await init({ scope: 'project', ...options });
    }
  });

program
  .command('install')
  .description('Install rules globally (~/.claude/, ~/.codex/)')
  .option('--rules <url>', 'Git repository URL for rules')
  .option('--copy', 'Copy files instead of symlink')
  .option('-i, --interactive', 'Use interactive mode with file selection')
  .action(async (options) => {
    if (options.interactive) {
      const { initInteractive } = await import('../dist/commands/init-interactive.js');
      await initInteractive();
    } else {
      const { init } = await import('../dist/commands/init.js');
      await init({ scope: 'global', ...options });
    }
  });

program
  .command('update')
  .description('Update installed rules to latest version')
  .option('-f, --force', 'Overwrite all modified files')
  .option('-a, --add-only', 'Only add new files, never overwrite')
  .option('-i, --interactive', 'Choose which files to overwrite')
  .action(async (options) => {
    const { update } = await import('../dist/commands/update.js');
    await update(options);
  });

program
  .command('list')
  .description('List available rules and keywords')
  .action(async () => {
    const { list } = await import('../dist/commands/list.js');
    await list();
  });

program
  .command('add <source>')
  .description('Add rules from a git repository')
  .option('--name <name>', 'Custom name for the rule source')
  .action(async (source, options) => {
    const { add } = await import('../dist/commands/add.js');
    await add(source, options);
  });

program
  .command('remove <name>')
  .description('Remove a rule source')
  .action(async (name) => {
    const { remove } = await import('../dist/commands/remove.js');
    await remove(name);
  });

program
  .command('test [input]')
  .description('Test which rules will be loaded for given input')
  .option('--keyword', 'Use keyword matching only (skip AI)')
  .option('--list', 'List all registered keywords')
  .action(async (input, options) => {
    const { test, testKeywords } = await import('../dist/commands/test.js');
    if (options.list) {
      await testKeywords();
    } else if (input) {
      await test(input, options);
    } else {
      console.log('Usage: ai-rules test <input> [--keyword]');
      console.log('       ai-rules test --list');
    }
  });

program
  .command('uninstall')
  .description('Remove ai-rules installation')
  .option('-f, --force', 'Skip confirmation prompt')
  .option('-g, --global', 'Uninstall global installation only')
  .option('-p, --project', 'Uninstall project installation only')
  .action(async (options) => {
    const { uninstall } = await import('../dist/commands/uninstall.js');
    await uninstall(options);
  });

program
  .command('doctor')
  .description('Diagnose ai-rules installation')
  .action(async () => {
    const { doctor } = await import('../dist/commands/doctor.js');
    await doctor();
  });

program.parse();
