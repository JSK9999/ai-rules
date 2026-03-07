/**
 * Integration test for semantic router with PROMPT_COMPRESSION_ENABLED.
 * Uses temp dirs to avoid touching real ~/.claude
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';

const TEST_DIR = path.join(os.tmpdir(), 'ai-nexus-compression-test-' + Date.now());
const CLAUDE_DIR = path.join(TEST_DIR, '.claude');
const RULES_DIR = path.join(CLAUDE_DIR, 'rules');
const INACTIVE_DIR = path.join(CLAUDE_DIR, 'rules-inactive');
const HOOK_PATH = path.join(process.cwd(), 'config', 'hooks', 'semantic-router.cjs');

describe('Semantic Router with Compression', () => {
  beforeEach(() => {
    fs.mkdirSync(RULES_DIR, { recursive: true });
    fs.mkdirSync(INACTIVE_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(INACTIVE_DIR, 'essential.md'),
      '---\ndescription: Core rules\n---\n# Essential\nKeep small'
    );
    fs.writeFileSync(
      path.join(INACTIVE_DIR, 'security.md'),
      '---\ndescription: Security\n---\n# Security\nNo secrets'
    );
    fs.writeFileSync(
      path.join(INACTIVE_DIR, 'commit.md'),
      '---\ndescription: Commit format\n---\n# Commit\nUse conventional commits'
    );
  });

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should produce _compressed-context.md when PROMPT_COMPRESSION_ENABLED=true', () => {
    const env = {
      ...process.env,
      PROMPT_COMPRESSION_ENABLED: 'true',
      SEMANTIC_ROUTER_ENABLED: 'false',
    };
    const result = spawnSync('node', [HOOK_PATH, 'write a commit message'], {
      env: { ...env, cwd: TEST_DIR },
      cwd: TEST_DIR,
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);

    const compressedPath = path.join(RULES_DIR, '_compressed-context.md');
    expect(fs.existsSync(compressedPath)).toBe(true);

    const content = fs.readFileSync(compressedPath, 'utf8');
    expect(content).toContain('<!-- rules/');
    expect(content).toContain('essential');
    expect(content).toContain('security');
    expect(content).toContain('commit');
    expect(content).not.toContain('description:');
  });

  it('should use normal swap when PROMPT_COMPRESSION_ENABLED=false', () => {
    fs.renameSync(
      path.join(INACTIVE_DIR, 'essential.md'),
      path.join(RULES_DIR, 'essential.md')
    );
    fs.renameSync(
      path.join(INACTIVE_DIR, 'security.md'),
      path.join(RULES_DIR, 'security.md')
    );

    const env = {
      ...process.env,
      PROMPT_COMPRESSION_ENABLED: 'false',
      SEMANTIC_ROUTER_ENABLED: 'false',
    };
    spawnSync('node', [HOOK_PATH, 'unrelated prompt xyz'], {
      env: { ...env, cwd: TEST_DIR },
      cwd: TEST_DIR,
      encoding: 'utf8',
    });

    const compressedPath = path.join(RULES_DIR, '_compressed-context.md');
    expect(fs.existsSync(compressedPath)).toBe(false);
  });
});
