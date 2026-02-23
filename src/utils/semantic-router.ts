import fs from 'fs';
import path from 'path';
import https from 'https';
import { detectInstall } from './files.js';

// Environment variables
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SEMANTIC_ROUTER_ENABLED = process.env.SEMANTIC_ROUTER_ENABLED === 'true';

// Model configuration
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export interface FileInfo {
  category: string;
  file: string;
  path: string;
  description: string;
  keywords: string[];
}

export interface SelectResult {
  files: string[];
  method: 'semantic' | 'keyword';
}

// ─────────────────────────────────────────────
// File list and description collection
// ─────────────────────────────────────────────

export function getFileList(configDir: string): FileInfo[] {
  const categories = ['rules', 'commands', 'skills', 'agents', 'contexts'];
  const fileList: FileInfo[] = [];

  for (const category of categories) {
    const dir = path.join(configDir, category);
    if (!fs.existsSync(dir)) continue;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Handle subdirectories (e.g., affaan-m/)
        const subDir = path.join(dir, entry.name);
        const subFiles = fs.readdirSync(subDir).filter(f => f.endsWith('.md'));

        for (const file of subFiles) {
          const filePath = path.join(subDir, file);
          const info = parseFileInfo(filePath, category, `${entry.name}/${file}`);
          if (info) fileList.push(info);
        }
      } else if (entry.name.endsWith('.md')) {
        const filePath = path.join(dir, entry.name);
        const info = parseFileInfo(filePath, category, entry.name);
        if (info) fileList.push(info);
      }
    }
  }

  return fileList;
}

function parseFileInfo(filePath: string, category: string, fileName: string): FileInfo | null {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Extract description and keywords from frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    let description = '';
    let keywords: string[] = [];

    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const descMatch = frontmatter.match(/description:\s*(.+)/);
      const keywordsMatch = frontmatter.match(/keywords:\s*\[(.+)\]/);

      if (descMatch) description = descMatch[1].trim();
      if (keywordsMatch) {
        keywords = keywordsMatch[1].split(',').map(k => k.trim().replace(/['"]/g, ''));
      }
    }

    // Fall back to first H1 heading if no description
    if (!description) {
      const firstLine = content.split('\n').find(l => l.startsWith('#'));
      if (firstLine) description = firstLine.replace(/^#+\s*/, '');
    }

    return {
      category,
      file: fileName,
      path: `${category}/${fileName}`,
      description: description || fileName,
      keywords
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// Claude API call
// ─────────────────────────────────────────────

async function callClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.content && json.content[0]) {
            resolve(json.content[0].text);
          } else {
            reject(new Error('Invalid response: ' + body));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ─────────────────────────────────────────────
// OpenAI API call
// ─────────────────────────────────────────────

async function callOpenAI(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.choices && json.choices[0]) {
            resolve(json.choices[0].message.content);
          } else {
            reject(new Error('Invalid response: ' + body));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ─────────────────────────────────────────────
// Semantic Router - AI-based file selection
// ─────────────────────────────────────────────

async function selectFilesWithAI(userInput: string, fileList: FileInfo[]): Promise<string[] | null> {
  const fileListText = fileList.map(f =>
    `- ${f.path}: ${f.description}`
  ).join('\n');

  const prompt = `A user made the following request to an AI coding assistant:
"${userInput}"

Here are the available rule/skill files:
${fileListText}

Select only the files that are essential for handling this request.
Do not select unrelated files.

Response format (JSON array only, no other text):
["rules/commit.md", "commands/commit.md"]

If no files are needed, return an empty array: []`;

  let response: string;
  try {
    if (ANTHROPIC_API_KEY) {
      response = await callClaude(prompt);
    } else if (OPENAI_API_KEY) {
      response = await callOpenAI(prompt);
    } else {
      return null;
    }

    // Extract JSON array
    const match = response.match(/\[[\s\S]*?\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// Keyword-based fallback
// ─────────────────────────────────────────────

type CategoryFiles = {
  rules?: string[];
  commands?: string[];
  skills?: string[];
  agents?: string[];
  contexts?: string[];
};

const KEYWORD_MAP: Record<string, CategoryFiles> = {
  'commit': { rules: ['commit.md'], commands: ['commit.md'] },
  '커밋': { rules: ['commit.md'], commands: ['commit.md'] },
  'pr': { rules: ['pr.md'] },
  'pull request': { rules: ['pr.md'] },
  '풀리퀘': { rules: ['pr.md'] },
  'merge': { rules: ['pr.md'] },
  '머지': { rules: ['pr.md'] },
  'security': { rules: ['security.md'], agents: ['security-rules.md'] },
  '보안': { rules: ['security.md'], agents: ['security-rules.md'] },
  'review': { commands: ['review.md'], skills: ['review.md'], agents: ['review-checklist.md'] },
  '리뷰': { commands: ['review.md'], skills: ['review.md'], agents: ['review-checklist.md'] },
  'react': { skills: ['react.md'] },
  '리액트': { skills: ['react.md'] },
  'next': { skills: ['nextjs.md'] },
  'nextjs': { skills: ['nextjs.md'] },
  'typescript': { rules: ['typescript.md'] },
  'ts': { rules: ['typescript.md'] },
  'test': { rules: ['testing.md'], commands: ['test.md'] },
  'testing': { rules: ['testing.md'], commands: ['test.md'] },
  '테스트': { rules: ['testing.md'], commands: ['test.md'] },
  'error': { rules: ['error-handling.md'] },
  'exception': { rules: ['error-handling.md'] },
  'naming': { rules: ['naming.md'] },
  'python': { skills: ['python.md'] },
  'django': { skills: ['python.md'] },
  'fastapi': { skills: ['python.md'] },
  'go': { skills: ['go.md'] },
  'golang': { skills: ['go.md'] },
  'rust': { skills: ['rust.md'] },
  'cargo': { skills: ['rust.md'] },
  'docker': { skills: ['docker.md'] },
  'container': { skills: ['docker.md'] },
  'dockerfile': { skills: ['docker.md'] },
  'api': { skills: ['api-design.md'] },
  'rest': { skills: ['api-design.md'] },
  'endpoint': { skills: ['api-design.md'] },
  'vue': { skills: ['vue.md'] },
  'nuxt': { skills: ['vue.md'] },
  'svelte': { skills: ['svelte.md'] },
  'sveltekit': { skills: ['svelte.md'] },
  'refactor': { commands: ['refactor.md'] },
  '리팩토링': { commands: ['refactor.md'] },
  'debug': { commands: ['debug.md'], contexts: ['debug.md'] },
  '디버그': { commands: ['debug.md'], contexts: ['debug.md'] },
  'bug': { commands: ['debug.md'], contexts: ['debug.md'] },
  'code': { agents: ['code-standards.md'] },
  '코드': { agents: ['code-standards.md'] },
  'standard': { agents: ['code-standards.md'] },
  'dev': { contexts: ['dev.md'] },
  '개발': { contexts: ['dev.md'] },
  'develop': { contexts: ['dev.md'] },
  'research': { contexts: ['research.md'] },
  '리서치': { contexts: ['research.md'] },
  '조사': { contexts: ['research.md'] },
  'workflow': { rules: ['development-workflow.md'] },
  '워크플로우': { rules: ['development-workflow.md'] },
  'threshold': { rules: ['code-thresholds.md'] },
  '기준': { rules: ['code-thresholds.md'] },
};

export function selectFilesWithKeywords(userInput: string): string[] {
  const lower = userInput.toLowerCase();
  const result: Record<string, Set<string>> = {
    rules: new Set(),
    commands: new Set(),
    skills: new Set(),
    agents: new Set(),
    contexts: new Set()
  };

  for (const [keyword, files] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(keyword.toLowerCase())) {
      for (const [category, fileList] of Object.entries(files)) {
        if (result[category] && fileList) {
          fileList.forEach(f => result[category].add(f));
        }
      }
    }
  }

  const selected: string[] = [];
  for (const [category, files] of Object.entries(result)) {
    for (const file of files) {
      selected.push(`${category}/${file}`);
    }
  }
  return selected;
}

// ─────────────────────────────────────────────
// Load file contents
// ─────────────────────────────────────────────

export function loadFile(configDir: string, filePath: string): string {
  const fullPath = path.join(configDir, filePath);
  try {
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      return `\n<!-- ${filePath} -->\n${content}\n`;
    }
  } catch {
    // Ignore
  }
  return '';
}

// ─────────────────────────────────────────────
// Main router function
// ─────────────────────────────────────────────

export async function selectFiles(userInput: string): Promise<SelectResult> {
  const install = detectInstall();
  if (!install) {
    return { files: [], method: 'keyword' };
  }

  const configDir = path.join(install.configPath, 'config');

  // Use AI when Semantic Router is enabled
  if (SEMANTIC_ROUTER_ENABLED && (ANTHROPIC_API_KEY || OPENAI_API_KEY)) {
    const fileList = getFileList(configDir);
    const aiSelected = await selectFilesWithAI(userInput, fileList);

    if (aiSelected) {
      return { files: aiSelected, method: 'semantic' };
    }
  }

  // Fallback: keyword matching
  return { files: selectFilesWithKeywords(userInput), method: 'keyword' };
}

export function loadSelectedFiles(files: string[]): string {
  const install = detectInstall();
  if (!install) return '';

  const configDir = path.join(install.configPath, 'config');

  // Always load essential.md first
  let output = loadFile(configDir, 'rules/essential.md');

  for (const filePath of files) {
    if (filePath !== 'rules/essential.md') {
      output += loadFile(configDir, filePath);
    }
  }

  return output;
}

export function isSemanticRouterEnabled(): boolean {
  return SEMANTIC_ROUTER_ENABLED && !!(ANTHROPIC_API_KEY || OPENAI_API_KEY);
}

export function getKeywordMap(): Record<string, CategoryFiles> {
  return KEYWORD_MAP;
}
