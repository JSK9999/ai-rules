import fs from 'fs';
import path from 'path';
import { detectInstall } from '../utils/files.js';

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

export async function list(): Promise<void> {
  const install = detectInstall();

  if (!install) {
    console.log('\n📋 ai-nexus - No installation found\n');
    console.log('Run "ai-nexus init" or "ai-nexus install" to get started.\n');
    return;
  }

  const { configPath, scope } = install;
  const configDir = path.join(configPath, 'config');

  console.log('\n📋 ai-nexus - Installed Rules\n');
  console.log('='.repeat(50));

  // Read metadata
  const metaPath = path.join(configPath, 'meta.json');
  if (fs.existsSync(metaPath)) {
    const meta: DotrulesMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    console.log(`\nScope: ${scope}`);
    console.log(`Mode: ${meta.mode}`);
    console.log(`Sources:`);
    for (const source of meta.sources) {
      if (source.type === 'external') {
        console.log(`  - ${source.name} (${source.url})`);
      } else {
        console.log(`  - ${source.name}`);
      }
    }
  }

  // List files by category
  const categories = ['rules', 'commands', 'skills', 'agents', 'contexts'];

  for (const category of categories) {
    const catDir = path.join(configDir, category);
    if (!fs.existsSync(catDir)) continue;

    const files = listFilesRecursive(catDir);
    if (files.length === 0) continue;

    console.log(`\n${category}/`);
    for (const file of files) {
      const filePath = path.join(catDir, file);
      const lines = fs.readFileSync(filePath, 'utf8').split('\n').length;
      console.log(`  └─ ${file} (${lines} lines)`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('💡 Run "ai-nexus update" to sync latest rules\n');
}

function listFilesRecursive(dir: string, base = ''): string[] {
  const result: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const relPath = base ? path.join(base, entry.name) : entry.name;
    if (entry.isDirectory()) {
      result.push(...listFilesRecursive(path.join(dir, entry.name), relPath));
    } else if (entry.name.endsWith('.md')) {
      result.push(relPath);
    }
  }

  return result;
}
