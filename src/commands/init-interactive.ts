import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import {
  getTargetDir,
  getConfigPath,
  ensureDir,
  createSymlink,
  scanDir,
  computeFileHashes,
  aggregateToAgentsMd,
} from '../utils/files.js';
import { scanConfigDir } from '../utils/config-scanner.js';
import type { DotrulesMeta } from '../types.js';

// Convert .md to .mdc format for Cursor
function convertToMdc(content: string, filename: string): string {
  const isEssential = filename.toLowerCase().includes('essential');
  const alwaysApply = isEssential ? 'true' : 'false';

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (frontmatterMatch) {
    let frontmatter = frontmatterMatch[1];
    if (!frontmatter.includes('alwaysApply')) {
      frontmatter = frontmatter + `\nalwaysApply: ${alwaysApply}`;
    }
    return content.replace(frontmatterMatch[1], frontmatter);
  } else {
    return `---\nalwaysApply: ${alwaysApply}\n---\n\n${content}`;
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, '../..');
const require = createRequire(import.meta.url);

interface Selections {
  scope: 'project' | 'global';
  tools: string[];
  categories: string[];
  selectedFiles: Record<string, string[]>;
  template: string | null;
  method: 'symlink' | 'copy';
}

const TEMPLATES = [
  { name: '🚀 React/Next.js', value: 'react-nextjs' },
  { name: '🖥️  Node/Express', value: 'node-express' },
  { name: '📝 Basic (minimal)', value: 'basic' },
  { name: '⏭️  Skip', value: null },
];

export async function initInteractive(): Promise<void> {
  console.clear();
  printHeader();

  const builtinConfigDir = path.join(PACKAGE_ROOT, 'config');
  const configInfo = scanConfigDir(builtinConfigDir);

  // Step 1: Select scope
  const { scope } = await inquirer.prompt<{ scope: 'project' | 'global' }>([
    {
      type: 'list',
      name: 'scope',
      message: 'Select installation scope',
      choices: [
        { name: '📁 Current project (.claude/, .codex/)', value: 'project' },
        { name: '🏠 Global (~/.claude/, ~/.codex/)', value: 'global' },
      ],
    },
  ]);

  // Step 2: Select tools
  const { tools } = await inquirer.prompt<{ tools: string[] }>([
    {
      type: 'checkbox',
      name: 'tools',
      message: 'Select tools to install',
      choices: [
        { name: 'Claude Code (.claude/)', value: 'claude', checked: true },
        { name: 'Codex (.codex/)', value: 'codex', checked: false },
        { name: 'Cursor (.cursor/rules/)', value: 'cursor', checked: false },
      ],
      validate: (input: string[]) => input.length > 0 || 'Select at least one tool',
    },
  ]);

  // Step 3: Select categories
  const categoryChoices = configInfo.map(cat => ({
    name: `${cat.name}/ (${cat.label}) - ${cat.files.length} files`,
    value: cat.name,
    checked: ['rules', 'commands'].includes(cat.name),
  }));

  // Add hooks and settings options for Claude Code
  if (tools.includes('claude')) {
    categoryChoices.push(
      { name: 'hooks/ (Semantic Router) - Claude Code hook', value: 'hooks', checked: true },
      { name: 'settings.json (Claude Code settings)', value: 'settings', checked: true }
    );
  }

  const { categories } = await inquirer.prompt<{ categories: string[] }>([
    {
      type: 'checkbox',
      name: 'categories',
      message: 'Select categories to install (Space to select, Enter to confirm)',
      choices: categoryChoices,
      validate: (input: string[]) => input.length > 0 || 'Select at least one category',
    },
  ]);

  // Step 4: Detailed file selection
  const { detailSelect } = await inquirer.prompt<{ detailSelect: boolean }>([
    {
      type: 'confirm',
      name: 'detailSelect',
      message: 'Select individual files?',
      default: false,
    },
  ]);

  const selectedFiles: Record<string, string[]> = {};

  if (detailSelect) {
    for (const category of categories) {
      const catInfo = configInfo.find(c => c.name === category);
      if (!catInfo) continue;

      console.log(chalk.cyan(`\n📂 ${category}/ (${catInfo.label})`));

      const fileChoices = catInfo.files.map(file => ({
        name: file.description
          ? `${file.name} - ${chalk.gray(file.description)}`
          : file.name,
        value: file.file,
        checked: true,
      }));

      const { files } = await inquirer.prompt<{ files: string[] }>([
        {
          type: 'checkbox',
          name: 'files',
          message: `Select files to install`,
          choices: fileChoices,
          pageSize: 15,
        },
      ]);

      selectedFiles[category] = files;
    }
  } else {
    // Select all
    for (const category of categories) {
      const catInfo = configInfo.find(c => c.name === category);
      if (catInfo) {
        selectedFiles[category] = catInfo.files.map(f => f.file);
      }
    }
  }

  // Step 5: Select template
  const { template } = await inquirer.prompt<{ template: string | null }>([
    {
      type: 'list',
      name: 'template',
      message: 'Select project template (generates CLAUDE.md)',
      choices: TEMPLATES,
    },
  ]);

  // Step 6: Select install method
  const { method } = await inquirer.prompt<{ method: 'symlink' | 'copy' }>([
    {
      type: 'list',
      name: 'method',
      message: 'Select install method',
      choices: [
        {
          name: '🔗 symlink (auto-update via ai-nexus update)',
          value: 'symlink',
        },
        {
          name: '📄 copy (independent copy)',
          value: 'copy',
        },
      ],
    },
  ]);

  // Step 7: Confirmation
  console.log(chalk.cyan('\n📋 Installation Summary\n'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(`   Scope: ${scope === 'global' ? 'Global (~/)' : 'Project (./)'}` );
  console.log(`   Tools: ${tools.join(', ')}`);
  console.log(`   Method: ${method === 'symlink' ? 'symlink' : 'copy'}`);
  console.log(`   Template: ${template || 'None'}`);
  console.log(`   Categories:`);

  let totalFiles = 0;
  for (const category of categories) {
    const count = selectedFiles[category]?.length || 0;
    totalFiles += count;
    console.log(`      • ${category}/ (${count} files)`);
  }
  console.log(chalk.gray('─'.repeat(40)));
  console.log(`   Total: ${totalFiles} files\n`);

  const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Proceed with installation?',
      default: true,
    },
  ]);

  if (!confirmed) {
    console.log(chalk.yellow('\nCancelled.\n'));
    return;
  }

  // Install
  const spinner = ora('Installing...').start();

  try {
    await install({
      scope,
      tools,
      categories,
      selectedFiles,
      template,
      method,
    });
    spinner.succeed('Installation complete!');
  } catch (error) {
    spinner.fail('Installation failed');
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    return;
  }

  // Completion message
  const targetDir = getTargetDir(scope);

  console.log(chalk.green('\n✅ ai-nexus installed successfully!\n'));
  console.log(chalk.gray('─'.repeat(40)));

  if (tools.includes('claude')) {
    console.log(`   Claude: ${path.join(targetDir, '.claude')}`);
  }
  if (tools.includes('codex')) {
    console.log(`   Codex:  ${path.join(targetDir, '.codex')}`);
  }
  if (tools.includes('cursor')) {
    console.log(`   Cursor: ${path.join(targetDir, '.cursor/rules')}`);
  }
  console.log(`   Mode: ${method}`);
  if (template) {
    console.log(`   Template: ${template}`);
  }
  console.log(chalk.gray('─'.repeat(40)));

  // Next steps
  console.log(chalk.cyan('\n📋 Next Steps:\n'));

  if (method === 'symlink') {
    console.log(chalk.white('  1. Run "ai-nexus update" to sync latest rules'));
  }

  const hasApiKey = !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
  if (!hasApiKey && tools.includes('claude') && categories.includes('hooks')) {
    console.log(chalk.white('  2. Enable AI-powered rule selection (optional):'));
    console.log(chalk.gray('     Add to ~/.zshrc or ~/.bashrc:'));
    console.log(chalk.gray('       export SEMANTIC_ROUTER_ENABLED=true'));
    console.log(chalk.gray('       export OPENAI_API_KEY=sk-...   # or ANTHROPIC_API_KEY'));
    console.log(chalk.gray('     Cost: ~$0.50/month (GPT-4o-mini or Claude Haiku)'));
  }

  console.log(chalk.white(`  ${hasApiKey ? '2' : '3'}. Run "ai-nexus doctor" to verify setup`));
  console.log(chalk.white(`  ${hasApiKey ? '3' : '4'}. Run "ai-nexus browse" to explore community rules`));
  console.log();
}

async function install(selections: Selections): Promise<void> {
  const { scope, tools, categories, selectedFiles, template, method } = selections;
  const targetDir = getTargetDir(scope);
  const aiRulesDir = getConfigPath(scope);
  const configDir = path.join(aiRulesDir, 'config');

  // Create directories
  ensureDir(aiRulesDir);
  ensureDir(configDir);

  const builtinConfigDir = path.join(PACKAGE_ROOT, 'config');

  // Filter out special categories (hooks, settings)
  const fileCategories = categories.filter(c => !['hooks', 'settings'].includes(c));

  // Copy selected files to .ai-nexus/config/
  for (const category of fileCategories) {
    const srcCatDir = path.join(builtinConfigDir, category);
    const destCatDir = path.join(configDir, category);

    if (!fs.existsSync(srcCatDir)) continue;

    ensureDir(destCatDir);

    const files = selectedFiles[category] || [];
    for (const file of files) {
      const srcFile = path.join(srcCatDir, file);
      const destFile = path.join(destCatDir, file);

      if (fs.existsSync(srcFile)) {
        ensureDir(path.dirname(destFile));
        fs.copyFileSync(srcFile, destFile);
      }
    }
  }

  // Install for each selected tool
  for (const tool of tools) {
    if (tool === 'cursor') {
      // Cursor: install .mdc files to .cursor/rules/
      const cursorRulesDir = path.join(targetDir, '.cursor', 'rules');
      ensureDir(cursorRulesDir);

      for (const category of fileCategories) {
        const srcCatDir = path.join(configDir, category);
        if (!fs.existsSync(srcCatDir)) continue;

        const files = selectedFiles[category] || [];
        for (const file of files) {
          const srcFile = path.join(srcCatDir, file);
          if (!fs.existsSync(srcFile)) continue;

          const mdcName = file.replace('.md', '.mdc');
          const destFile = path.join(cursorRulesDir, mdcName);

          // Local priority: skip if file exists
          if (fs.existsSync(destFile)) continue;

          const content = fs.readFileSync(srcFile, 'utf8');
          const mdcContent = convertToMdc(content, file);
          ensureDir(path.dirname(destFile));
          fs.writeFileSync(destFile, mdcContent);
        }
      }
      continue;
    }

    const toolDir = path.join(targetDir, tool === 'claude' ? '.claude' : '.codex');
    ensureDir(toolDir);

    // Create symlinks or copy to tool directory
    for (const category of fileCategories) {
      const sourceDir = path.join(configDir, category);
      const targetPath = path.join(toolDir, category);

      if (!fs.existsSync(sourceDir)) continue;

      // Local priority: skip if directory exists and is not a symlink
      if (fs.existsSync(targetPath)) {
        try {
          const stat = fs.lstatSync(targetPath);
          if (!stat.isSymbolicLink()) {
            // Existing directory - only add new files
            if (method === 'copy') {
              const files = scanDir(sourceDir);
              for (const [rel, content] of Object.entries(files)) {
                const dest = path.join(targetPath, rel);
                if (!fs.existsSync(dest)) {
                  ensureDir(path.dirname(dest));
                  fs.writeFileSync(dest, content);
                }
              }
            }
            continue;
          }
          // Symlink - remove and recreate
          fs.unlinkSync(targetPath);
        } catch {
          // Ignore errors
        }
      }

      if (method === 'symlink') {
        createSymlink(sourceDir, targetPath);
      } else {
        // Copy mode
        const files = scanDir(sourceDir);
        for (const [rel, content] of Object.entries(files)) {
          const dest = path.join(targetPath, rel);
          ensureDir(path.dirname(dest));
          fs.writeFileSync(dest, content);
        }
      }
    }

    // Install hooks for Claude Code
    if (tool === 'claude' && categories.includes('hooks')) {
      const hooksDir = path.join(toolDir, 'hooks');
      const srcHooksDir = path.join(builtinConfigDir, 'hooks');

      if (fs.existsSync(srcHooksDir)) {
        ensureDir(hooksDir);

        const hooksFiles = fs.readdirSync(srcHooksDir);
        for (const file of hooksFiles) {
          const src = path.join(srcHooksDir, file);
          const dest = path.join(hooksDir, file);

          // Local priority: skip if file exists
          if (fs.existsSync(dest)) continue;

          if (fs.statSync(src).isFile()) {
            fs.copyFileSync(src, dest);
          }
        }
      }
    }

    // Install settings.json for Claude Code
    if (tool === 'claude' && categories.includes('settings')) {
      const settingsFile = path.join(builtinConfigDir, 'settings.json');
      const destSettings = path.join(toolDir, 'settings.json');

      // Local priority: skip if file exists
      if (!fs.existsSync(destSettings) && fs.existsSync(settingsFile)) {
        fs.copyFileSync(settingsFile, destSettings);
      }
    }

    // Copy template CLAUDE.md or AGENTS.md
    if (template) {
      const templateDir = path.join(builtinConfigDir, 'templates', template);

      if (tool === 'claude') {
        const templateFile = path.join(templateDir, 'CLAUDE.md');
        const destTemplate = path.join(toolDir, 'CLAUDE.md');
        // Local priority: skip if file exists
        if (!fs.existsSync(destTemplate) && fs.existsSync(templateFile)) {
          fs.copyFileSync(templateFile, destTemplate);
        }
      }
    }

    // Generate aggregated AGENTS.md for Codex
    if (tool === 'codex') {
      const destAgents = path.join(toolDir, 'AGENTS.md');
      // Local priority: skip if file exists
      if (!fs.existsSync(destAgents)) {
        const content = aggregateToAgentsMd(configDir, selectedFiles);
        fs.writeFileSync(destAgents, content);
      }
    }
  }

  // Save metadata (compute file hashes for copy mode conflict detection)
  const claudeDir = path.join(targetDir, '.claude');
  const meta: DotrulesMeta = {
    version: require(path.join(PACKAGE_ROOT, 'package.json')).version,
    mode: method,
    tools,
    template,
    sources: [{ name: 'builtin', type: 'builtin' }],
    selectedFiles,
    ...(method === 'copy' ? { fileHashes: computeFileHashes(claudeDir) } : {}),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(aiRulesDir, 'meta.json'),
    JSON.stringify(meta, null, 2)
  );
}

function printHeader(): void {
  console.log(chalk.cyan(`
   ╭─────────────────────────────────╮
   │                                 │
   │   ${chalk.bold('ai-nexus')} Setup Wizard           │
   │                                 │
   ╰─────────────────────────────────╯
`));
}
