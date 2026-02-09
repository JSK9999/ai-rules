import fs from 'fs';
import path from 'path';
import os from 'os';

export interface ScanResult {
  [relativePath: string]: Buffer;
}

export function scanDir(dir: string, base = ''): ScanResult {
  const result: ScanResult = {};
  if (!fs.existsSync(dir)) return result;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = base ? path.join(base, entry.name) : entry.name;

    if (entry.isDirectory()) {
      Object.assign(result, scanDir(fullPath, relPath));
    } else {
      result[relPath] = fs.readFileSync(fullPath);
    }
  }
  return result;
}

export interface DiffResult {
  added: string[];
  modified: string[];
  removed: string[];
  unchanged: string[];
}

export function compareConfigs(source: ScanResult, installed: ScanResult): DiffResult {
  const added: string[] = [];
  const modified: string[] = [];
  const removed: string[] = [];
  const unchanged: string[] = [];

  for (const [rel, buf] of Object.entries(source)) {
    if (!(rel in installed)) {
      added.push(rel);
    } else if (!buf.equals(installed[rel])) {
      modified.push(rel);
    } else {
      unchanged.push(rel);
    }
  }

  for (const rel of Object.keys(installed)) {
    if (!(rel in source)) {
      removed.push(rel);
    }
  }

  return { added, modified, removed, unchanged };
}

export function getTargetDir(scope: 'project' | 'global'): string {
  return scope === 'global' ? os.homedir() : process.cwd();
}

export function getConfigPath(scope: 'project' | 'global'): string {
  const base = getTargetDir(scope);
  return path.join(base, '.ai-nexus');
}

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function copyFile(src: string, dest: string): void {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

export function createSymlink(target: string, linkPath: string): void {
  ensureDir(path.dirname(linkPath));
  if (fs.existsSync(linkPath)) {
    fs.rmSync(linkPath, { recursive: true });
  }
  fs.symlinkSync(target, linkPath);
}

export function detectInstall(): { configPath: string; scope: 'project' | 'global' } | null {
  const projectPath = path.join(process.cwd(), '.ai-nexus');
  if (fs.existsSync(projectPath)) {
    return { configPath: projectPath, scope: 'project' };
  }

  const globalPath = path.join(os.homedir(), '.ai-nexus');
  if (fs.existsSync(globalPath)) {
    return { configPath: globalPath, scope: 'global' };
  }

  return null;
}
