import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { detectInstall } from '../utils/files.js';
import { scanConfigDir } from '../utils/config-scanner.js';
import type { DotrulesMeta } from '../types.js';

export async function list(): Promise<void> {
  const install = detectInstall();

  if (!install) {
    console.log('\n  ai-nexus - No installation found\n');
    console.log('  Run "ai-nexus install" or "ai-nexus init" to get started.\n');
    return;
  }

  const { configPath, scope } = install;
  const configDir = path.join(configPath, 'config');

  console.log(chalk.bold('\n  ai-nexus - Installed Rules\n'));
  console.log(chalk.gray('  ' + '-'.repeat(48)));

  // Read metadata
  const metaPath = path.join(configPath, 'meta.json');
  if (fs.existsSync(metaPath)) {
    const meta: DotrulesMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    console.log(`  Scope:   ${scope}`);
    console.log(`  Sources: ${(meta.sources ?? []).map(s => s.type === 'external' ? `${s.name} (${s.url})` : s.name).join(', ')}`);
  }

  // List files by category with descriptions
  const categories = scanConfigDir(configDir);
  let totalFiles = 0;

  for (const category of categories) {
    console.log(chalk.bold(`\n  ${category.name}/`));

    for (const file of category.files) {
      totalFiles++;
      const desc = file.description
        ? chalk.gray(` - ${truncate(file.description, 50)}`)
        : '';
      console.log(`    ${file.file}${desc}`);
    }
  }

  // Summary
  console.log(chalk.gray('\n  ' + '-'.repeat(48)));
  console.log(`  ${totalFiles} files across ${categories.length} categories`);

  // Semantic router status
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  if (hasOpenAI || hasAnthropic) {
    console.log(chalk.green(`  Semantic Router: AI routing (${hasOpenAI ? 'OpenAI' : 'Anthropic'})`));
  } else {
    console.log(chalk.yellow('  Semantic Router: keyword fallback (no API key)'));
  }

  console.log(chalk.gray('\n  Tip: ai-nexus test <prompt>  to preview rule selection\n'));
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '...' : str;
}
