import { execSync } from 'child_process';
import fs from 'fs';

export interface RuleSource {
  name: string;
  url: string;
  localPath: string;
  lastUpdated?: string;
}

export function parseGitUrl(url: string): { host: string; owner: string; repo: string } {
  // Handle various formats:
  // - github.com/org/repo
  // - https://github.com/org/repo
  // - git@github.com:org/repo.git

  const normalized = url
    .replace(/^(https?:\/\/)?/, '')
    .replace(/^git@/, '')
    .replace(/\.git$/, '')
    .replace(':', '/');

  const parts = normalized.split('/');
  if (parts.length < 3) {
    throw new Error(`Invalid git URL: ${url}`);
  }

  return {
    host: parts[0],
    owner: parts[1],
    repo: parts[2],
  };
}

export function normalizeGitUrl(url: string): string {
  const { host, owner, repo } = parseGitUrl(url);
  return `https://${host}/${owner}/${repo}.git`;
}

export function cloneRepo(url: string, targetDir: string): void {
  const normalizedUrl = normalizeGitUrl(url);

  if (fs.existsSync(targetDir)) {
    // Update existing repo
    execSync('git pull --ff-only', {
      cwd: targetDir,
      stdio: 'pipe',
    });
  } else {
    // Clone new repo
    execSync(`git clone --depth 1 ${normalizedUrl} "${targetDir}"`, {
      stdio: 'pipe',
    });
  }
}

export function updateRepo(repoPath: string): boolean {
  try {
    const result = execSync('git pull --ff-only', {
      cwd: repoPath,
      stdio: 'pipe',
    });
    return result.toString().includes('Already up to date') === false;
  } catch {
    return false;
  }
}

export function getRepoName(url: string): string {
  const { repo } = parseGitUrl(url);
  return repo;
}
