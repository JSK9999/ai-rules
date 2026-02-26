import fs from 'fs';
import path from 'path';
import { detectInstall, ensureDir, scanDir } from '../utils/files.js';
import { cloneRepo, getRepoName, normalizeGitUrl } from '../utils/git.js';

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

interface AddOptions {
  name?: string;
}

export async function add(source: string, options: AddOptions): Promise<void> {
  const install = detectInstall();

  if (!install) {
    console.log('\n❌ No ai-nexus installation found.');
    console.log('   Run "ai-nexus init" or "ai-nexus install" first.\n');
    process.exit(1);
  }

  const { configPath } = install;

  console.log(`\n📥 Adding rule source: ${source}\n`);

  // Parse source URL
  const repoName = options.name || getRepoName(source);
  const normalizedUrl = normalizeGitUrl(source);

  // Check if already exists
  const metaPath = path.join(configPath, 'meta.json');
  const meta: DotrulesMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

  if (meta.sources.some(s => s.name === repoName)) {
    console.log(`❌ Source "${repoName}" already exists.`);
    console.log('   Run "ai-nexus update" to update it.\n');
    process.exit(1);
  }

  // Clone repository
  const sourcesDir = path.join(configPath, 'sources');
  const repoPath = path.join(sourcesDir, repoName);

  try {
    ensureDir(sourcesDir);
    cloneRepo(source, repoPath);
    console.log(`   ✓ Cloned ${repoName}`);
  } catch (error) {
    console.error(`   ✗ Failed to clone: ${error}`);
    process.exit(1);
  }

  // Merge rules
  const configDir = path.join(configPath, 'config');
  const externalConfigDir = path.join(repoPath, 'config');
  const sourceConfigDir = fs.existsSync(externalConfigDir) ? externalConfigDir : repoPath;

  const categories = ['rules', 'commands', 'skills', 'agents', 'contexts'];
  let addedCount = 0;

  for (const category of categories) {
    const srcCat = path.join(sourceConfigDir, category);
    if (!fs.existsSync(srcCat)) continue;

    const destCat = path.join(configDir, category);
    ensureDir(destCat);

    const files = scanDir(srcCat);
    for (const [rel, content] of Object.entries(files)) {
      const dest = path.join(destCat, rel);

      // Prefix with source name to avoid conflicts
      const destWithPrefix = path.join(
        path.dirname(dest),
        `${repoName}-${path.basename(dest)}`
      );

      ensureDir(path.dirname(destWithPrefix));
      fs.writeFileSync(destWithPrefix, content);
      addedCount++;
    }
  }

  // Update metadata
  meta.sources.push({
    name: repoName,
    url: normalizedUrl,
    type: 'external',
  });
  meta.updatedAt = new Date().toISOString();
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  console.log(`\n✅ Added ${addedCount} files from "${repoName}"`);
  console.log('   Run "ai-nexus update" to sync changes.\n');
}
