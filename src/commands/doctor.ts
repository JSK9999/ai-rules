import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { detectInstall } from '../utils/files.js';

interface CheckResult {
  name: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
  fix?: string;
}

export async function doctor(): Promise<void> {
  console.log(chalk.cyan('\n🩺 ai-nexus doctor\n'));
  console.log(chalk.gray('─'.repeat(50)));

  const results: CheckResult[] = [];

  // Check 1: Installation
  const install = detectInstall();
  if (install) {
    results.push({
      name: 'Installation',
      status: 'ok',
      message: `Found ${install.scope} installation at ${install.configPath}`,
    });

    // Check mode
    const metaPath = path.join(install.configPath, 'meta.json');
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        results.push({
          name: 'Mode',
          status: 'ok',
          message: `${meta.mode} mode`,
        });
      } catch {
        results.push({
          name: 'Metadata',
          status: 'warn',
          message: 'meta.json exists but could not be parsed',
        });
      }
    } else {
      results.push({
        name: 'Metadata',
        status: 'warn',
        message: 'meta.json not found',
      });
    }
  } else {
    results.push({
      name: 'Installation',
      status: 'error',
      message: 'No installation found.',
      fix: 'Run: ai-nexus install (global) or ai-nexus init (project)',
    });
  }

  // Check 2: Claude Code directories
  const home = os.homedir();
  const cwd = process.cwd();

  const claudeDirs = [
    { path: path.join(home, '.claude'), label: 'Global .claude' },
    { path: path.join(cwd, '.claude'), label: 'Project .claude' },
  ];

  for (const dir of claudeDirs) {
    if (fs.existsSync(dir.path)) {
      const rulesDir = path.join(dir.path, 'rules');
      const hooksDir = path.join(dir.path, 'hooks');
      const settingsFile = path.join(dir.path, 'settings.json');

      const hasRules = fs.existsSync(rulesDir);
      const hasHooks = fs.existsSync(hooksDir);
      const hasSettings = fs.existsSync(settingsFile);

      if (hasRules && hasHooks && hasSettings) {
        results.push({
          name: dir.label,
          status: 'ok',
          message: 'rules/, hooks/, settings.json all present',
        });
      } else {
        const missing = [];
        if (!hasRules) missing.push('rules/');
        if (!hasHooks) missing.push('hooks/');
        if (!hasSettings) missing.push('settings.json');
        results.push({
          name: dir.label,
          status: 'warn',
          message: `Missing: ${missing.join(', ')}`,
          fix: 'Run: ai-nexus install --copy',
        });
      }
    }
  }

  // Check 3: Semantic Router Hook
  const globalHook = path.join(home, '.claude', 'hooks', 'semantic-router.cjs');
  const projectHook = path.join(cwd, '.claude', 'hooks', 'semantic-router.cjs');

  if (fs.existsSync(globalHook) || fs.existsSync(projectHook)) {
    results.push({
      name: 'Semantic Router',
      status: 'ok',
      message: 'Hook installed',
    });
  } else {
    results.push({
      name: 'Semantic Router',
      status: 'warn',
      message: 'Hook not found. Dynamic rule loading disabled.',
      fix: 'Run: ai-nexus install (hooks are installed automatically)',
    });
  }

  // Check 4: settings.json hook configuration
  const globalSettings = path.join(home, '.claude', 'settings.json');
  const projectSettings = path.join(cwd, '.claude', 'settings.json');

  let hookConfigured = false;
  for (const settingsPath of [globalSettings, projectSettings]) {
    if (fs.existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        if (settings.hooks?.UserPromptSubmit) {
          hookConfigured = true;
          break;
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  if (hookConfigured) {
    results.push({
      name: 'Hook Config',
      status: 'ok',
      message: 'UserPromptSubmit hook configured in settings.json',
    });
  } else {
    results.push({
      name: 'Hook Config',
      status: 'warn',
      message: 'No UserPromptSubmit hook in settings.json',
      fix: 'Run: ai-nexus install (settings.json is created automatically)',
    });
  }

  // Check 4b: Hook timeout
  for (const settingsPath of [globalSettings, projectSettings]) {
    if (fs.existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        const hooks = settings.hooks?.UserPromptSubmit;
        if (Array.isArray(hooks)) {
          for (const hook of hooks) {
            if (typeof hook.timeout === 'number' && hook.timeout < 120) {
              results.push({
                name: 'Hook Timeout',
                status: 'warn',
                message: `Hook timeout is ${hook.timeout}s (recommended: 120s+)`,
                fix: `Edit ${settingsPath} and set "timeout": 120`,
              });
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }

  // Check 5: API Keys for semantic routing
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  if (hasOpenAI || hasAnthropic) {
    results.push({
      name: 'AI Routing',
      status: 'ok',
      message: `API key found: ${hasOpenAI ? 'OpenAI' : 'Anthropic'}`,
    });
  } else {
    results.push({
      name: 'AI Routing',
      status: 'warn',
      message: 'No API key. Using keyword fallback.',
      fix: 'Add to your shell profile (~/.zshrc):\n  export ANTHROPIC_API_KEY=sk-ant-...\n  or export OPENAI_API_KEY=sk-...',
    });
  }

  // Check 6: Cursor
  const cursorDir = path.join(cwd, '.cursor', 'rules');
  if (fs.existsSync(cursorDir)) {
    const mdcFiles = fs.readdirSync(cursorDir).filter(f => f.endsWith('.mdc'));
    if (mdcFiles.length > 0) {
      results.push({
        name: 'Cursor',
        status: 'ok',
        message: `${mdcFiles.length} .mdc files in .cursor/rules/`,
      });
    } else {
      results.push({
        name: 'Cursor',
        status: 'warn',
        message: '.cursor/rules/ exists but no .mdc files',
      });
    }
  }

  // Check 7: Codex
  const codexAgents = path.join(cwd, '.codex', 'AGENTS.md');
  const globalCodexAgents = path.join(home, '.codex', 'AGENTS.md');
  if (fs.existsSync(codexAgents) || fs.existsSync(globalCodexAgents)) {
    results.push({
      name: 'Codex',
      status: 'ok',
      message: 'AGENTS.md found',
    });
  }

  // Print results
  console.log('');
  for (const result of results) {
    const icon = result.status === 'ok' ? chalk.green('✓') :
                 result.status === 'warn' ? chalk.yellow('⚠') :
                 chalk.red('✗');
    const statusColor = result.status === 'ok' ? chalk.green :
                        result.status === 'warn' ? chalk.yellow :
                        chalk.red;

    console.log(`${icon} ${chalk.bold(result.name)}`);
    console.log(`  ${statusColor(result.message)}`);
    if (result.fix && result.status !== 'ok') {
      console.log(`  ${chalk.gray('Fix:')} ${result.fix}`);
    }
    console.log('');
  }

  console.log(chalk.gray('─'.repeat(50)));

  // Summary
  const errors = results.filter(r => r.status === 'error').length;
  const warnings = results.filter(r => r.status === 'warn').length;

  if (errors > 0) {
    console.log(chalk.red(`\n❌ ${errors} error(s) found. Run "ai-nexus install" to fix.\n`));
  } else if (warnings > 0) {
    console.log(chalk.yellow(`\n⚠️  ${warnings} warning(s). Everything should still work.\n`));
  } else {
    console.log(chalk.green('\n✅ All checks passed!\n'));
  }
}
