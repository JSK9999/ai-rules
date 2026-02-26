import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'url';
import { fetchRegistry, fetchFileContent, searchFiles, extractDescription } from '../utils/registry.js';
import { detectInstall, ensureDir } from '../utils/files.js';
import { scanConfigDir } from '../utils/config-scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CheckResult {
  name: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
  fix?: string;
}

function collectDiagnostics(): CheckResult[] {
  const results: CheckResult[] = [];
  const install = detectInstall();
  const home = os.homedir();
  const cwd = process.cwd();

  if (install) {
    results.push({ name: 'Installation', status: 'ok', message: `${install.scope} (${install.configPath})` });
    const metaPath = path.join(install.configPath, 'meta.json');
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      results.push({ name: 'Mode', status: 'ok', message: `${meta.mode} mode` });
    } catch {
      results.push({ name: 'Metadata', status: 'warn', message: 'meta.json not found or invalid' });
    }
  } else {
    results.push({ name: 'Installation', status: 'error', message: 'Not installed', fix: 'ai-nexus install' });
  }

  for (const { p, label } of [{ p: path.join(home, '.claude'), label: 'Global .claude' }, { p: path.join(cwd, '.claude'), label: 'Project .claude' }]) {
    if (!fs.existsSync(p)) continue;
    const missing = ['rules', 'hooks', 'settings.json'].filter(d => !fs.existsSync(path.join(p, d)));
    results.push(missing.length === 0
      ? { name: label, status: 'ok', message: 'rules/, hooks/, settings.json' }
      : { name: label, status: 'warn', message: `Missing: ${missing.join(', ')}` });
  }

  const hasHook = fs.existsSync(path.join(home, '.claude', 'hooks', 'semantic-router.cjs')) ||
                  fs.existsSync(path.join(cwd, '.claude', 'hooks', 'semantic-router.cjs'));
  results.push(hasHook
    ? { name: 'Semantic Router', status: 'ok', message: 'Hook installed' }
    : { name: 'Semantic Router', status: 'warn', message: 'Hook not found' });

  const hasKey = !!process.env.OPENAI_API_KEY || !!process.env.ANTHROPIC_API_KEY;
  results.push(hasKey
    ? { name: 'AI Routing', status: 'ok', message: `API key: ${process.env.OPENAI_API_KEY ? 'OpenAI' : 'Anthropic'}` }
    : { name: 'AI Routing', status: 'warn', message: 'No API key, keyword fallback' });

  return results;
}

function getVersion(): string {
  try {
    let dir = __dirname;
    for (let i = 0; i < 5; i++) {
      const pkg = path.join(dir, 'package.json');
      if (fs.existsSync(pkg)) return JSON.parse(fs.readFileSync(pkg, 'utf8')).version || 'unknown';
      dir = path.dirname(dir);
    }
  } catch { /* ignore */ }
  return 'unknown';
}

function getSources(install: { configPath: string } | null): Array<{ name: string; type: string; url?: string }> {
  if (!install) return [];
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(install.configPath, 'meta.json'), 'utf8'));
    return meta.sources || [];
  } catch { return []; }
}

function getInstallDir(install: { configPath: string; scope: string }): string {
  const targetDir = install.scope === 'global' ? os.homedir() : process.cwd();
  return path.join(targetDir, '.claude');
}

async function handleStatus(): Promise<object> {
  const install = detectInstall();
  const home = os.homedir();
  const cwd = process.cwd();
  const configDir = install ? path.join(install.configPath, 'config') : '';
  const installed = configDir && fs.existsSync(configDir) ? scanConfigDir(configDir) : [];

  // Tool counts derived from installed data (same source as My Rules)
  const claudeCount = installed.reduce((sum, cat) => sum + cat.files.length, 0);

  let mdcCount = 0;
  try { mdcCount = fs.readdirSync(path.join(cwd, '.cursor', 'rules')).filter(f => f.endsWith('.mdc')).length; } catch { /* ignore */ }

  const hasCodex = fs.existsSync(path.join(cwd, '.codex', 'AGENTS.md')) || fs.existsSync(path.join(home, '.codex', 'AGENTS.md'));

  const tools = [
    { name: 'Claude Code', status: claudeCount > 0 ? 'ok' : 'none', count: claudeCount, detail: claudeCount > 0 ? `${claudeCount} files active` : 'Not configured' },
    { name: 'Cursor', status: mdcCount > 0 ? 'ok' : 'none', count: mdcCount, detail: mdcCount > 0 ? `${mdcCount} .mdc files` : 'Not configured' },
    { name: 'Codex', status: hasCodex ? 'ok' : 'none', count: hasCodex ? 1 : 0, detail: hasCodex ? 'AGENTS.md found' : 'Not configured' },
  ];

  return {
    install: install ? { scope: install.scope, configPath: install.configPath } : null,
    diagnostics: collectDiagnostics(),
    tools,
    installed,
    sources: getSources(install),
    version: getVersion(),
  };
}

async function handleRegistry(query?: string): Promise<object> {
  const files = await fetchRegistry();
  const filtered = query ? searchFiles(files, query) : files;
  const withDesc = await Promise.all(filtered.map(async (f) => {
    try {
      const content = await fetchFileContent(f);
      return { ...f, description: extractDescription(content) || '' };
    } catch { return { ...f, description: '' }; }
  }));
  return { files: withDesc };
}

async function handleInstall(body: { category: string; filename: string }): Promise<object> {
  const install = detectInstall();
  if (!install) return { error: 'Not installed. Run: ai-nexus install' };

  const files = await fetchRegistry();
  const match = files.find(f => f.category === body.category && f.name === body.filename);
  if (!match) return { error: 'File not found in registry' };

  const content = await fetchFileContent(match);
  const dest = path.join(install.configPath, 'config', body.category, body.filename);
  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, content, 'utf8');

  // Also copy to .claude/ if in copy mode
  const claudeDir = getInstallDir(install);
  const claudeDest = path.join(claudeDir, body.category, body.filename);
  if (fs.existsSync(claudeDir) && !fs.lstatSync(path.join(claudeDir, body.category)).isSymbolicLink?.()) {
    ensureDir(path.dirname(claudeDest));
    fs.writeFileSync(claudeDest, content, 'utf8');
  }

  return { ok: true, path: dest };
}

async function handleDeleteFile(body: { category: string; filename: string }): Promise<object> {
  const install = detectInstall();
  if (!install) return { error: 'Not installed' };

  const filePath = path.join(install.configPath, 'config', body.category, body.filename);
  if (!fs.existsSync(filePath)) return { error: 'File not found' };
  fs.unlinkSync(filePath);
  return { ok: true };
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => data += c);
    req.on('end', () => resolve(data));
  });
}

function openBrowser(url: string): void {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  try { execSync(`${cmd} ${url}`, { stdio: 'ignore' }); } catch { /* ignore */ }
}

export async function browse(port = 3847): Promise<void> {
  const htmlPath = path.join(__dirname, '..', 'browse', 'browse.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');

  const json = (res: http.ServerResponse, data: object) => {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify(data));
  };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${port}`);
    const method = req.method || 'GET';

    try {
      if (url.pathname === '/api/status' && method === 'GET') {
        json(res, await handleStatus());
      } else if (url.pathname === '/api/registry' && method === 'GET') {
        json(res, await handleRegistry(url.searchParams.get('q') || undefined));
      } else if (url.pathname === '/api/install' && method === 'POST') {
        const body = JSON.parse(await readBody(req));
        json(res, await handleInstall(body));
      } else if (url.pathname === '/api/file' && method === 'DELETE') {
        const body = JSON.parse(await readBody(req));
        json(res, await handleDeleteFile(body));
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      }
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message || 'Internal error' }));
    }
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`\n  Port ${port} in use — open http://localhost:${port}\n`);
      openBrowser(`http://localhost:${port}`);
    } else {
      console.error(`\n  Server error: ${err.message}\n`);
      process.exit(1);
    }
  });

  server.listen(port, () => {
    console.log(`\n  ai-nexus browse: http://localhost:${port}`);
    console.log(`  Ctrl+C to quit\n`);
    openBrowser(`http://localhost:${port}`);
  });
}
