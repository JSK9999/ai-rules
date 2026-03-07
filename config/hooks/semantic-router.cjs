const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration - detect project vs global install
const os = require('os');
const _projectRules = path.join(process.cwd(), '.claude/rules');
const RULES_DIR = fs.existsSync(_projectRules)
  ? _projectRules
  : path.join(os.homedir(), '.claude/rules');
const INACTIVE_DIR = RULES_DIR.replace(/rules$/, 'rules-inactive');
const SEMANTIC_ROUTER_ENABLED = process.env.SEMANTIC_ROUTER_ENABLED === 'true';
const PROMPT_COMPRESSION_ENABLED = process.env.PROMPT_COMPRESSION_ENABLED === 'true';
const COMPRESSED_FILE = '_compressed-context.md';

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
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') && f !== COMPRESSED_FILE);

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

// ─── Heuristic compression (zero deps) ─────────────────────────────────────
function stripFrontmatter(content) {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n*/, '').trim();
}
function collapseBlankLines(content) {
  return content.replace(/\n{3,}/g, '\n\n');
}
function removeFillerPhrases(content) {
  return content
    .replace(/\b(it is )?important to\s+/gi, '')
    .replace(/\b(you should )?always remember to\s+/gi, '')
    .replace(/\b(please )?make sure to\s+/gi, '')
    .replace(/\b(be )?sure to\s+/gi, '')
    .replace(/\bin order to\s+/gi, ' ')
    .replace(/\b(so )?that (you|we) can\s+/gi, ' ');
}
function deduplicateBullets(content) {
  const lines = content.split('\n');
  const seen = new Set();
  const result = [];
  for (const line of lines) {
    const normalized = line.replace(/^[\s\-*]+/, '').trim().toLowerCase();
    if (normalized.length < 5) { result.push(line); continue; }
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(line);
  }
  return result.join('\n');
}
function compressRuleContent(content) {
  let r = stripFrontmatter(content);
  r = removeFillerPhrases(r);
  r = deduplicateBullets(r);
  r = collapseBlankLines(r);
  return r.trim();
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
    try { activeFiles = fs.readdirSync(RULES_DIR).filter(f => f.endsWith('.md') && f !== COMPRESSED_FILE); } catch(e) {}
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

    if (PROMPT_COMPRESSION_ENABLED) {
      // Compression mode: merge selected rules into one compressed file
      // 1. Move all .md from rules/ to inactive (so we have originals)
      for (const f of activeFiles) {
        const src = path.join(RULES_DIR, f);
        if (fs.existsSync(src)) {
          fs.renameSync(src, path.join(INACTIVE_DIR, f));
        }
      }
      const compressedPath = path.join(RULES_DIR, COMPRESSED_FILE);
      if (fs.existsSync(compressedPath)) {
        fs.unlinkSync(compressedPath);
      }
      // 2. Read desired files, compress, write single file
      const parts = [];
      for (const file of desiredFiles) {
        const p1 = path.join(INACTIVE_DIR, file);
        const p2 = path.join(RULES_DIR, file);
        const filePath = fs.existsSync(p1) ? p1 : p2;
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          const compressed = compressRuleContent(content);
          parts.push(`<!-- rules/${file} -->\n${compressed}`);
        }
      }
      if (parts.length > 0) {
        fs.writeFileSync(compressedPath, parts.join('\n\n'), 'utf8');
        console.log(`[Router] Compressed ${parts.length} rules → ${COMPRESSED_FILE}`);
      }
    } else {
      // Normal mode: swap individual files
      const compressedPath = path.join(RULES_DIR, COMPRESSED_FILE);
      if (fs.existsSync(compressedPath)) {
        fs.unlinkSync(compressedPath);
        console.log(`[Router] Removed ${COMPRESSED_FILE}`);
      }
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
    }

  } catch (error) {
    console.error('[Semantic Router] Error:', error);
  }
}

// Hook Entry Point
// Claude Code passes UserPromptSubmit data via stdin as JSON: {"prompt": "..."}
// Also support argv[2] for direct CLI testing (ai-nexus test)
function getPrompt() {
  return new Promise((resolve) => {
    // If called with an argument directly, use it
    if (process.argv[2]) {
      resolve(process.argv[2]);
      return;
    }

    // Otherwise read from stdin (Claude Code hook format)
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => {
      try {
        const json = JSON.parse(data);
        resolve(json.prompt || null);
      } catch {
        resolve(data.trim() || null);
      }
    });
    // If stdin is not a pipe (e.g., terminal), don't hang
    if (process.stdin.isTTY) resolve(null);
  });
}

getPrompt().then(prompt => {
  if (prompt) route(prompt).catch(err => console.error('[Semantic Router] Error:', err));
});
