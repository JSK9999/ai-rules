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
} from '../utils/files.js';
import { scanConfigDir, type ConfigFile } from '../utils/config-scanner.js';
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
  { name: '📝 기본 (최소 설정)', value: 'basic' },
  { name: '⏭️  건너뛰기', value: null },
];

export async function initInteractive(): Promise<void> {
  console.clear();
  printHeader();

  const builtinConfigDir = path.join(PACKAGE_ROOT, 'config');
  const configInfo = scanConfigDir(builtinConfigDir);

  // Step 1: 설치 범위 선택
  const { scope } = await inquirer.prompt<{ scope: 'project' | 'global' }>([
    {
      type: 'list',
      name: 'scope',
      message: '설치 범위를 선택하세요',
      choices: [
        { name: '📁 현재 프로젝트 (.claude/, .codex/)', value: 'project' },
        { name: '🏠 전역 설치 (~/.claude/, ~/.codex/)', value: 'global' },
      ],
    },
  ]);

  // Step 2: 도구 선택
  const { tools } = await inquirer.prompt<{ tools: string[] }>([
    {
      type: 'checkbox',
      name: 'tools',
      message: '설치할 도구를 선택하세요',
      choices: [
        { name: 'Claude Code (.claude/)', value: 'claude', checked: true },
        { name: 'Codex (.codex/)', value: 'codex', checked: false },
        { name: 'Cursor (.cursor/rules/)', value: 'cursor', checked: false },
      ],
      validate: (input: string[]) => input.length > 0 || '최소 하나 이상 선택해주세요',
    },
  ]);

  // Step 3: 카테고리 선택
  const categoryChoices = configInfo.map(cat => ({
    name: `${cat.name}/ (${cat.label}) - ${cat.files.length}개 파일`,
    value: cat.name,
    checked: ['rules', 'commands'].includes(cat.name),
  }));

  // Add hooks and settings options for Claude Code
  if (tools.includes('claude')) {
    categoryChoices.push(
      { name: 'hooks/ (Semantic Router) - Claude Code hook', value: 'hooks', checked: true },
      { name: 'settings.json (Claude Code 설정)', value: 'settings', checked: true }
    );
  }

  const { categories } = await inquirer.prompt<{ categories: string[] }>([
    {
      type: 'checkbox',
      name: 'categories',
      message: '설치할 항목을 선택하세요 (Space로 선택, Enter로 확인)',
      choices: categoryChoices,
      validate: (input: string[]) => input.length > 0 || '최소 하나 이상 선택해주세요',
    },
  ]);

  // Step 4: 상세 선택 (파일별)
  const { detailSelect } = await inquirer.prompt<{ detailSelect: boolean }>([
    {
      type: 'confirm',
      name: 'detailSelect',
      message: '파일별로 상세 선택하시겠습니까?',
      default: false,
    },
  ]);

  let selectedFiles: Record<string, string[]> = {};

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
          message: `설치할 파일을 선택하세요`,
          choices: fileChoices,
          pageSize: 15,
        },
      ]);

      selectedFiles[category] = files;
    }
  } else {
    // 전체 선택
    for (const category of categories) {
      const catInfo = configInfo.find(c => c.name === category);
      if (catInfo) {
        selectedFiles[category] = catInfo.files.map(f => f.file);
      }
    }
  }

  // Step 5: 템플릿 선택
  const { template } = await inquirer.prompt<{ template: string | null }>([
    {
      type: 'list',
      name: 'template',
      message: '프로젝트 템플릿을 선택하세요 (CLAUDE.md 생성)',
      choices: TEMPLATES,
    },
  ]);

  // Step 6: 설치 방식 선택
  const { method } = await inquirer.prompt<{ method: 'symlink' | 'copy' }>([
    {
      type: 'list',
      name: 'method',
      message: '설치 방식을 선택하세요',
      choices: [
        {
          name: '🔗 symlink (ai-nexus update로 자동 업데이트)',
          value: 'symlink',
        },
        {
          name: '📄 copy (독립적인 복사본)',
          value: 'copy',
        },
      ],
    },
  ]);

  // Step 7: 확인
  console.log(chalk.cyan('\n📋 설치 요약\n'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(`   범위: ${scope === 'global' ? '전역 (~/)' : '프로젝트 (./)'}` );
  console.log(`   도구: ${tools.join(', ')}`);
  console.log(`   방식: ${method === 'symlink' ? 'symlink' : 'copy'}`);
  console.log(`   템플릿: ${template || '없음'}`);
  console.log(`   항목:`);

  let totalFiles = 0;
  for (const category of categories) {
    const count = selectedFiles[category]?.length || 0;
    totalFiles += count;
    console.log(`      • ${category}/ (${count}개)`);
  }
  console.log(chalk.gray('─'.repeat(40)));
  console.log(`   총 ${totalFiles}개 파일\n`);

  const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
    {
      type: 'confirm',
      name: 'confirmed',
      message: '설치를 진행하시겠습니까?',
      default: true,
    },
  ]);

  if (!confirmed) {
    console.log(chalk.yellow('\n취소되었습니다.\n'));
    return;
  }

  // 설치 진행
  const spinner = ora('설치 중...').start();

  try {
    await install({
      scope,
      tools,
      categories,
      selectedFiles,
      template,
      method,
    });
    spinner.succeed('설치 완료!');
  } catch (error) {
    spinner.fail('설치 실패');
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    return;
  }

  // 완료 메시지
  const targetDir = getTargetDir(scope);

  console.log(chalk.green('\n✅ ai-nexus 설치 완료!\n'));
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
  console.log(`   모드: ${method}`);
  if (template) {
    console.log(`   템플릿: ${template}`);
  }
  console.log(chalk.gray('─'.repeat(40)));

  if (method === 'symlink') {
    console.log(chalk.cyan('\n💡 팁: ai-nexus update로 최신 규칙을 동기화하세요\n'));
  }
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
        } catch (e) {
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

    // Copy AGENTS.md for Codex
    if (tool === 'codex') {
      const agentsFile = path.join(builtinConfigDir, 'codex', 'AGENTS.md');
      const destAgents = path.join(toolDir, 'AGENTS.md');
      // Local priority: skip if file exists
      if (!fs.existsSync(destAgents) && fs.existsSync(agentsFile)) {
        fs.copyFileSync(agentsFile, destAgents);
      }
    }
  }

  // Save metadata
  const meta: DotrulesMeta = {
    version: require(path.join(PACKAGE_ROOT, 'package.json')).version,
    mode: method,
    tools,
    template,
    sources: [{ name: 'builtin', type: 'builtin' }],
    selectedFiles,
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
   │   ${chalk.bold('ai-nexus')} 설치 마법사           │
   │                                 │
   ╰─────────────────────────────────╯
`));
}
