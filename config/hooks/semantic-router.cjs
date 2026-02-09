const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration - Use home directory's .claude
const os = require('os');
const RULES_DIR = path.join(os.homedir(), '.claude/rules');
const INACTIVE_DIR = path.join(os.homedir(), '.claude/rules-inactive');
const SEMANTIC_ROUTER_ENABLED = process.env.SEMANTIC_ROUTER_ENABLED !== 'false'; // Default to true unless explicitly disabled

// Map file names to keywords for fallback and management identification
const KEYWORD_MAP = {
  'testing.md': ['test', 'spec', 'jest', 'vitest', 'unit', 'e2e'],
  'typescript.md': ['ts', 'typescript', 'interface', 'type'],
  'react.md': ['react', 'component', 'jsx', 'tsx', 'hook'],
  'node.md': ['node', 'express', 'server', 'api'],
  'git.md': ['git', 'commit', 'merge', 'branch', 'rebase'],
  'security.md': ['security', 'auth', 'token', 'secret', 'password'],
  'performance.md': ['perf', 'performance', 'optimize', 'speed', 'memory'],
  'commit.md': ['commit', 'git', 'message', 'convention'],
};

const ALWAYS_ACTIVE = ['essential.md', 'security.md']; // Files that are always kept active

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
    req.on('error', (e) => {
      resolve(null);
    });
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
            // OpenAI JSON mode might return { "files": [...] } or just [...]
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
    req.on('error', (e) => {
      resolve(null);
    });
    req.write(data);
    req.end();
  });
}

// Helper: Keyword fallback
function selectByKeywords(prompt) {
  const selected = [];
  const lowerPrompt = prompt.toLowerCase();
  for (const [file, keywords] of Object.entries(KEYWORD_MAP)) {
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

    // 1. Identify all managed files (active + inactive)
    let activeFiles = [];
    try { activeFiles = fs.readdirSync(RULES_DIR).filter(f => f.endsWith('.md')); } catch(e) {}
    let inactiveFiles = [];
    try { inactiveFiles = fs.readdirSync(INACTIVE_DIR).filter(f => f.endsWith('.md')); } catch(e) {}

    // Managed files are those in KEYWORD_MAP
    const allManagedFiles = Object.keys(KEYWORD_MAP);

    // 2. Determine desired active files
    let desiredFiles = [...ALWAYS_ACTIVE];

    // Try AI routing if enabled
    const available = [...new Set([...activeFiles, ...inactiveFiles, ...allManagedFiles])];

    let aiSelected = null;
    if (SEMANTIC_ROUTER_ENABLED) {
        // Try OpenAI first
        aiSelected = await analyzeWithOpenAI(userPrompt, available);

        // If OpenAI fails or key is missing, try Claude
        if (!aiSelected) {
            aiSelected = await analyzeWithClaude(userPrompt, available);
        }
    }

    if (aiSelected) {
        desiredFiles.push(...aiSelected);
    } else {
        // Fallback to keywords
        desiredFiles.push(...selectByKeywords(userPrompt));
    }

    // Deduplicate
    desiredFiles = [...new Set(desiredFiles)];

    // 3. Execution: Swap files
    // Move unwanted managed files to inactive
    for (const file of activeFiles) {
        if (KEYWORD_MAP[file] && !desiredFiles.includes(file) && !ALWAYS_ACTIVE.includes(file)) {
            const src = path.join(RULES_DIR, file);
            const dest = path.join(INACTIVE_DIR, file);
            if (fs.existsSync(src)) {
                fs.renameSync(src, dest);
                console.log(`[Router] Deactivated: ${file}`);
            }
        }
    }

    // Move wanted files to active
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
