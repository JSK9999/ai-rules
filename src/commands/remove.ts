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

export async function remove(name: string): Promise<void> {
  const install = detectInstall();

  if (!install) {
    console.log('\n❌ No ai-nexus installation found.\n');
    process.exit(1);
  }

  const { configPath } = install;

  // Read metadata
  const metaPath = path.join(configPath, 'meta.json');
  const meta: DotrulesMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

  // Find source
  const sourceIndex = meta.sources.findIndex(s => s.name === name);
  if (sourceIndex === -1) {
    console.log(`\n❌ Source "${name}" not found.`);
    console.log('   Available sources:');
    for (const s of meta.sources) {
      console.log(`   - ${s.name}`);
    }
    console.log('');
    process.exit(1);
  }

  const source = meta.sources[sourceIndex];
  if (source.type === 'builtin') {
    console.log('\n❌ Cannot remove built-in source.\n');
    process.exit(1);
  }

  console.log(`\n🗑️  Removing source: ${name}\n`);

  // Remove source repository
  const repoPath = path.join(configPath, 'sources', name);
  if (fs.existsSync(repoPath)) {
    fs.rmSync(repoPath, { recursive: true });
    console.log(`   ✓ Removed repository`);
  }

  // Remove prefixed files from config
  const configDir = path.join(configPath, 'config');
  const categories = ['rules', 'commands', 'skills', 'agents', 'contexts'];
  let removedCount = 0;

  for (const category of categories) {
    const catDir = path.join(configDir, category);
    if (!fs.existsSync(catDir)) continue;

    const files = fs.readdirSync(catDir, { withFileTypes: true });
    for (const file of files) {
      if (file.isFile() && file.name.startsWith(`${name}-`)) {
        fs.unlinkSync(path.join(catDir, file.name));
        removedCount++;
      }
    }
  }

  // Update metadata
  meta.sources.splice(sourceIndex, 1);
  meta.updatedAt = new Date().toISOString();
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  console.log(`   ✓ Removed ${removedCount} files`);
  console.log(`\n✅ Source "${name}" removed.\n`);
}
