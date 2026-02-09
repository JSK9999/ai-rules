import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ensureDir, scanDir, compareConfigs } from '../src/utils/files.js';

describe('File Utilities', () => {
  const testDir = path.join(os.tmpdir(), 'ai-nexus-test-' + Date.now());

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('ensureDir', () => {
    it('should create directory if not exists', () => {
      const newDir = path.join(testDir, 'new-dir');
      ensureDir(newDir);
      expect(fs.existsSync(newDir)).toBe(true);
    });

    it('should not throw if directory exists', () => {
      ensureDir(testDir);
      expect(fs.existsSync(testDir)).toBe(true);
    });

    it('should create nested directories', () => {
      const nestedDir = path.join(testDir, 'a', 'b', 'c');
      ensureDir(nestedDir);
      expect(fs.existsSync(nestedDir)).toBe(true);
    });
  });

  describe('scanDir', () => {
    it('should scan directory and return files', () => {
      fs.writeFileSync(path.join(testDir, 'test.md'), 'content');
      const files = scanDir(testDir);
      expect(files['test.md'].toString()).toBe('content');
    });

    it('should scan nested directories', () => {
      const subDir = path.join(testDir, 'sub');
      fs.mkdirSync(subDir);
      fs.writeFileSync(path.join(subDir, 'nested.md'), 'nested content');
      const files = scanDir(testDir);
      expect(files['sub/nested.md'].toString()).toBe('nested content');
    });

    it('should return empty object for empty directory', () => {
      const emptyDir = path.join(testDir, 'empty');
      fs.mkdirSync(emptyDir);
      const files = scanDir(emptyDir);
      expect(Object.keys(files).length).toBe(0);
    });
  });

  describe('compareConfigs', () => {
    it('should detect added files', () => {
      const source = { 'new.md': Buffer.from('content') };
      const installed = {};
      const diff = compareConfigs(source, installed);
      expect(diff.added).toContain('new.md');
    });

    it('should detect removed files', () => {
      const source = {};
      const installed = { 'old.md': Buffer.from('content') };
      const diff = compareConfigs(source, installed);
      expect(diff.removed).toContain('old.md');
    });

    it('should detect modified files', () => {
      const source = { 'file.md': Buffer.from('new content') };
      const installed = { 'file.md': Buffer.from('old content') };
      const diff = compareConfigs(source, installed);
      expect(diff.modified).toContain('file.md');
    });

    it('should detect unchanged files', () => {
      const source = { 'file.md': Buffer.from('same content') };
      const installed = { 'file.md': Buffer.from('same content') };
      const diff = compareConfigs(source, installed);
      expect(diff.unchanged).toContain('file.md');
    });
  });
});
