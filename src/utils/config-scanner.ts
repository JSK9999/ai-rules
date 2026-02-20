import fs from 'fs';
import path from 'path';

export interface ConfigFile {
  name: string;
  file: string;
  path: string;
  description: string;
  category: string;
}

export interface CategoryInfo {
  name: string;
  label: string;
  files: ConfigFile[];
}

const CATEGORY_LABELS: Record<string, string> = {
  rules: 'Coding Rules',
  commands: 'Slash Commands',
  skills: 'AI Skills',
  agents: 'Sub-Agents',
  contexts: 'Contexts',
  hooks: 'Semantic Router Hook',
};

/**
 * Parse file metadata from frontmatter or H1 header
 */
function parseFileMeta(filePath: string): { name: string; description: string } {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let name = '';
    let description = '';

    // Try frontmatter first
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const nameMatch = frontmatter.match(/(?:name|title):\s*["']?(.+?)["']?\s*$/m);
      const descMatch = frontmatter.match(/description:\s*["']?(.+?)["']?\s*$/m);

      if (nameMatch) name = nameMatch[1].trim();
      if (descMatch) description = descMatch[1].trim();
    }

    // Fallback to H1 header
    if (!name) {
      const h1Match = content.match(/^#\s+(.+)$/m);
      if (h1Match) {
        name = h1Match[1].trim();
      }
    }

    // Fallback to filename
    if (!name) {
      name = path.basename(filePath, '.md');
    }

    return { name, description };
  } catch {
    return {
      name: path.basename(filePath, '.md'),
      description: '',
    };
  }
}

/**
 * Scan a directory for markdown files and extract metadata
 */
function scanCategoryDir(dir: string, category: string): ConfigFile[] {
  const files: ConfigFile[] = [];

  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Scan subdirectory
      const subFiles = fs.readdirSync(fullPath).filter(f => f.endsWith('.md'));
      for (const subFile of subFiles) {
        const subFilePath = path.join(fullPath, subFile);
        const meta = parseFileMeta(subFilePath);
        files.push({
          name: meta.name,
          file: `${entry.name}/${subFile}`,
          path: `${category}/${entry.name}/${subFile}`,
          description: meta.description,
          category,
        });
      }
    } else if (entry.name.endsWith('.md')) {
      const meta = parseFileMeta(fullPath);
      files.push({
        name: meta.name,
        file: entry.name,
        path: `${category}/${entry.name}`,
        description: meta.description,
        category,
      });
    }
  }

  return files;
}

/**
 * Scan all categories in a config directory
 */
export function scanConfigDir(configDir: string): CategoryInfo[] {
  const categories = ['rules', 'commands', 'skills', 'agents', 'contexts'];
  const result: CategoryInfo[] = [];

  for (const category of categories) {
    const dir = path.join(configDir, category);
    const files = scanCategoryDir(dir, category);

    if (files.length > 0) {
      result.push({
        name: category,
        label: CATEGORY_LABELS[category] || category,
        files,
      });
    }
  }

  return result;
}

/**
 * Get category label
 */
export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || category;
}
