import https from 'https';

const REPO_OWNER = 'JSK9999';
const REPO_NAME = 'ai-nexus';
const BRANCH = 'main';
const CATEGORIES = ['rules', 'commands', 'skills', 'agents', 'contexts'];

export interface RegistryFile {
  name: string;
  category: string;
  path: string;
  downloadUrl: string;
}

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'ai-nexus' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return httpsGet(res.headers.location!).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

export async function fetchRegistry(): Promise<RegistryFile[]> {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${BRANCH}?recursive=1`;
  const body = await httpsGet(url);
  const tree = JSON.parse(body);

  const files: RegistryFile[] = [];
  for (const item of tree.tree || []) {
    if (item.type !== 'blob') continue;
    if (!item.path.startsWith('config/')) continue;
    if (!item.path.endsWith('.md')) continue;

    const parts = item.path.replace('config/', '').split('/');
    if (parts.length < 2) continue;

    const category = parts[0];
    if (!CATEGORIES.includes(category)) continue;

    const name = parts.slice(1).join('/');

    files.push({
      name,
      category,
      path: item.path,
      downloadUrl: `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${item.path}`,
    });
  }

  return files;
}

export async function fetchFileContent(file: RegistryFile): Promise<string> {
  return httpsGet(file.downloadUrl);
}

export function extractDescription(content: string): string | null {
  const match = content.slice(0, 500).match(/^---\n[\s\S]*?description:\s*(.+)\n[\s\S]*?---/);
  return match ? match[1].trim() : null;
}

export function searchFiles(files: RegistryFile[], keyword: string): RegistryFile[] {
  const lower = keyword.toLowerCase();
  return files.filter(f => {
    const name = f.name.replace('.md', '').toLowerCase();
    return name.includes(lower) || f.category.includes(lower);
  });
}
