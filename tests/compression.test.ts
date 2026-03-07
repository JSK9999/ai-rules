import { describe, it, expect } from 'vitest';
import { compressRuleContent, compressRules } from '../src/utils/compression.js';

describe('Compression', () => {
  describe('compressRuleContent', () => {
    it('should strip frontmatter', () => {
      const input = `---
description: Test rule
---

# Title
Content here`;
      const result = compressRuleContent(input);
      expect(result).not.toContain('---');
      expect(result).not.toContain('description');
      expect(result).toContain('# Title');
      expect(result).toContain('Content here');
    });

    it('should collapse multiple blank lines', () => {
      const input = 'Line 1\n\n\n\nLine 2';
      const result = compressRuleContent(input);
      expect(result).toBe('Line 1\n\nLine 2');
    });

    it('should remove filler phrases', () => {
      const input = 'It is important to validate inputs. Make sure to check.';
      const result = compressRuleContent(input);
      expect(result).toContain('validate inputs');
      expect(result).not.toContain('It is important to');
      expect(result).not.toContain('Make sure to');
    });

    it('should deduplicate repeated bullets', () => {
      const input = `- Validate inputs
- Use HTTPS
- Validate inputs
- Use HTTPS`;
      const result = compressRuleContent(input);
      const lines = result.split('\n').filter((l) => l.trim().startsWith('-'));
      expect(lines.length).toBe(2);
    });

    it('should preserve structure of real rule content', () => {
      const input = `---
description: Git commit message format
---

# Commit Convention

## Format
\`<type>: <subject>\`

## Types
- feat: New feature
- fix: Bug fix`;
      const result = compressRuleContent(input);
      expect(result).toContain('# Commit Convention');
      expect(result).toContain('## Format');
      expect(result).toContain('feat: New feature');
      expect(result).not.toContain('description:');
    });
  });

  describe('compressRules', () => {
    it('should merge multiple rules with markers', () => {
      const rules = [
        { path: 'rules/essential.md', content: '---\ndescription: x\n---\n# Essential\nKeep small' },
        { path: 'rules/security.md', content: '---\ndescription: y\n---\n# Security\nNo secrets' },
      ];
      const result = compressRules(rules);
      expect(result).toContain('<!-- rules/essential.md -->');
      expect(result).toContain('<!-- rules/security.md -->');
      expect(result).toContain('Keep small');
      expect(result).toContain('No secrets');
      expect(result).not.toContain('description:');
    });
  });
});
