import { describe, it, expect } from 'vitest';
import { selectFilesWithKeywords, getKeywordMap } from '../src/utils/semantic-router.js';

describe('Semantic Router', () => {
  describe('getKeywordMap', () => {
    it('should return keyword map', () => {
      const map = getKeywordMap();
      expect(map).toBeDefined();
      expect(typeof map).toBe('object');
    });

    it('should have commit keyword', () => {
      const map = getKeywordMap();
      expect(map['commit']).toBeDefined();
    });
  });

  describe('selectFilesWithKeywords', () => {
    it('should select commit rules for commit-related input', () => {
      const files = selectFilesWithKeywords('write a commit message');
      expect(files).toContain('rules/commit.md');
      expect(files).toContain('commands/commit.md');
    });

    it('should select security rules for security-related input', () => {
      const files = selectFilesWithKeywords('check security vulnerabilities');
      expect(files).toContain('rules/security.md');
    });

    it('should select react skills for react-related input', () => {
      const files = selectFilesWithKeywords('create a react component');
      expect(files).toContain('skills/react.md');
    });

    it('should return empty array for unrelated input', () => {
      const files = selectFilesWithKeywords('hello world');
      expect(files).toEqual([]);
    });

    it('should handle Korean keywords', () => {
      const files = selectFilesWithKeywords('커밋 메시지 작성해줘');
      expect(files).toContain('rules/commit.md');
    });

    it('should handle multiple keywords', () => {
      const files = selectFilesWithKeywords('review the security of this commit');
      expect(files.length).toBeGreaterThan(1);
    });
  });
});
