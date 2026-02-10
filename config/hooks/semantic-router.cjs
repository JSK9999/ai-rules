const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration - Use home directory's .claude
const os = require('os');
const RULES_DIR = path.join(os.homedir(), '.claude/rules');
const INACTIVE_DIR = path.join(os.homedir(), '.claude/rules-inactive');
const SEMANTIC_ROUTER_ENABLED = process.env.SEMANTIC_ROUTER_ENABLED !== 'false';

// Static keyword map (fallback for files without frontmatter)
const STATIC_KEYWORD_MAP = {
  'testing.md': ['test', 'spec', 'jest', 'vitest', 'unit', 'e2e'],
  'typescript.md': ['ts', 'typescript', 'interface', 'type'],
  'react.md': ['react', 'component', 'jsx', 'tsx', 'hook'],
  'node.md': ['node', 'express', 'server', 'api'],
  'git.md': ['git', 'commit', 'merge', 'branch', 'rebase'],
  'security.md': ['security', 'auth', 'token', 'secret', 'password'],
  'performance.md': ['perf', 'performance', 'optimize', 'speed', 'memory'],
  'commit.md': ['commit', 'git', 'message', 'convention'],
};

const ALWAYS_ACTIVE = ['essential.md', 'security.md'];

// Build keyword map dynamically by scanning rule files
function buildKeywordMap() {
  const keywordMap = { ...STATIC_KEYWORD_MAP };
  const dirs = [RULES_DIR, INACTIVE_DIR];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

    for (const file of files) {
      if (keywordMap[file]) continue; // static map takes precedence
      if (ALWAYS_ACTIVE.includes(file)) continue;

      const filePath = path.join(dir, file);
      const keywords = extractKeywords(filePath, file);
      if (keywords.length > 0) {
        keywordMap[file] = keywords;
      }
    }
  }

  return keywordMap;
}

// Extract keywords from frontmatter description and filename
function extractKeywords(filePath, filename) {
  const keywords = [];

  // Add filename-based keyword (without .md)
  const baseName = filename.replace('.md', '').toLowerCase();
  keywords.push(baseName);
  // Add hyphen-split parts (e.g. "code-thresholds" -> "code", "thresholds")
  if (baseName.includes('-')) {
    baseName.split('-').forEach(part => {
      if (part.length > 2) keywords.push(part);
    });
  }

  // Parse frontmatter description for additional keywords
  try {
    const content = fs.readFileSync(filePath, 'utf8').slice(0, 500);
    const match = content.match(/^---\n[\s\S]*?description:\s*(.+)\n[\s\S]*?---/);
    if (match) {
      const desc = match[1].toLowerCase();
      // Extract meaningful words (3+ chars, no common stop words)
      const stopWords = ['the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'was', 'not'];
      const words = desc.match(/[a-z]{3,}/g) || [];
      words.forEach(w => {
        if (!stopWords.includes(w) && !keywords.includes(w)) {
          keywords.push(w);
        }
      });
    }
  } catch (e) {
    // Ignore read errors
  }

  return keywords;
}

// Helper: Ensure directories exist
function ensureDirs() {
  if (!fs.existsSync(RULES_DIR)) fs.mkdirSync(RULES_DIR, { recursive: true });
  if (!fs.existsSync(INACTIVE_DIR)) fs.mkdirSync(INACTIVE_DIR, { recursive: true });
}

// Helper: Call Claude API for semantic analysis
async function analyzeWithClaude(prompt, availableFiles) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const systemPrompt = `
You are a semantic router for a coding assistant. Your job is to select the most relevant rule files for a given user prompt.
Available files: ${availableFiles.join(', ')}
Return ONLY a JSON array of filenames that should be active. Do not include any explanation.
Example: ["react.md", "typescript.md"]
`;

  const data = JSON.stringify({
    model: 'claude-3-haiku-20240307',
    max_tokens: 100,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }]
  });

  const options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          const content = response.content?.[0]?.text;
          if (content) {
            const files = JSON.parse(content);
            resolve(files);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.write(data);
    req.end();
  });
}

// Helper: Call OpenAI API for semantic analysis
async function analyzeWithOpenAI(prompt, availableFiles) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const systemPrompt = `
You are a semantic router for a coding assistant. Your job is to select the most relevant rule files for a given user prompt.
Available files: ${availableFiles.join(', ')}
Return ONLY a JSON array of filenames that should be active. Do not include any explanation.
Example: ["react.md", "typescript.md"]
`;

  const data = JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature: 0,
    response_format: { type: 'json_object' }
  });

  const options = {
    hostname: 'api.openai.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          const content = response.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            const files = Array.isArray(parsed) ? parsed : (parsed.files || []);
            resolve(files);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.write(data);
    req.end();
  });
}

// Helper: Keyword fallback
function selectByKeywords(prompt, keywordMap) {
  const selected = [];
  const lowerPrompt = prompt.toLowerCase();
  for (const [file, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(k => lowerPrompt.includes(k))) {
      selected.push(file);
    }
  }
  return selected;
}

// Main Router Logic
async function route(userPrompt) {
  try {
    ensureDirs();

    // Build dynamic keyword map from actual rule files
    const keywordMap = buildKeywordMap();

    // 1. Identify all managed files (active + inactive)
    let activeFiles = [];
    try { activeFiles = fs.readdirSync(RULES_DIR).filter(f => f.endsWith('.md')); } catch(e) {}
    let inactiveFiles = [];
    try { inactiveFiles = fs.readdirSync(INACTIVE_DIR).filter(f => f.endsWith('.md')); } catch(e) {}

    const allManagedFiles = Object.keys(keywordMap);

    // 2. Determine desired active files
    let desiredFiles = [...ALWAYS_ACTIVE];

    const available = [...new Set([...activeFiles, ...inactiveFiles, ...allManagedFiles])];

    let aiSelected = null;
    if (SEMANTIC_ROUTER_ENABLED) {
      aiSelected = await analyzeWithOpenAI(userPrompt, available);
      if (!aiSelected) {
        aiSelected = await analyzeWithClaude(userPrompt, available);
      }
    }

    if (aiSelected) {
      desiredFiles.push(...aiSelected);
    } else {
      desiredFiles.push(...selectByKeywords(userPrompt, keywordMap));
    }

    desiredFiles = [...new Set(desiredFiles)];

    // 3. Swap files
    for (const file of activeFiles) {
      if (keywordMap[file] && !desiredFiles.includes(file) && !ALWAYS_ACTIVE.includes(file)) {
        const src = path.join(RULES_DIR, file);
        const dest = path.join(INACTIVE_DIR, file);
        if (fs.existsSync(src)) {
          fs.renameSync(src, dest);
          console.log(`[Router] Deactivated: ${file}`);
        }
      }
    }

    for (const file of desiredFiles) {
      if (allManagedFiles.includes(file)) {
        const inactivePath = path.join(INACTIVE_DIR, file);
        const activePath = path.join(RULES_DIR, file);
        if (fs.existsSync(inactivePath)) {
          fs.renameSync(inactivePath, activePath);
          console.log(`[Router] Activated: ${file}`);
        }
      }
    }

  } catch (error) {
    console.error('[Semantic Router] Error:', error);
  }
}

// Hook Entry Point
const userPrompt = process.argv[2];
if (userPrompt) {
  route(userPrompt);
}
