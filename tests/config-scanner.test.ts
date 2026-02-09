import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanConfigDir, getCategoryLabel } from '../src/utils/config-scanner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = path.resolve(__dirname, '../config');

describe('Config Scanner', () => {
  describe('scanConfigDir', () => {
    it('should scan config directory and return categories', () => {
      const categories = scanConfigDir(CONFIG_DIR);
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });

    it('should find rules category', () => {
      const categories = scanConfigDir(CONFIG_DIR);
      const rules = categories.find(c => c.name === 'rules');
      expect(rules).toBeDefined();
      expect(rules?.files.length).toBeGreaterThan(0);
    });

    it('should find commands category', () => {
      const categories = scanConfigDir(CONFIG_DIR);
      const commands = categories.find(c => c.name === 'commands');
      expect(commands).toBeDefined();
    });

    it('should extract file metadata', () => {
      const categories = scanConfigDir(CONFIG_DIR);
      const rules = categories.find(c => c.name === 'rules');
      const essentialFile = rules?.files.find(f => f.file === 'essential.md');
      expect(essentialFile).toBeDefined();
      expect(essentialFile?.name).toBeDefined();
    });
  });

  describe('getCategoryLabel', () => {
    it('should return correct label for rules', () => {
      expect(getCategoryLabel('rules')).toBe('코딩 규칙');
    });

    it('should return correct label for commands', () => {
      expect(getCategoryLabel('commands')).toBe('슬래시 커맨드');
    });

    it('should return category name for unknown category', () => {
      expect(getCategoryLabel('unknown')).toBe('unknown');
    });
  });
});
