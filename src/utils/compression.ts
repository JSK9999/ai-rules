/**
 * Heuristic prompt compression for rule content.
 * Zero dependencies, zero latency — targets redundancy removal and structural compression.
 *
 * Used when PROMPT_COMPRESSION_ENABLED=true to reduce token count of loaded rules.
 * See docs/research/prompt-compression.md for full research.
 */

/**
 * Strip YAML frontmatter from markdown content
 */
function stripFrontmatter(content: string): string {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n*/, '').trim();
}

/**
 * Collapse multiple blank lines to single newline
 */
function collapseBlankLines(content: string): string {
  return content.replace(/\n{3,}/g, '\n\n');
}

/**
 * Remove common filler phrases that add tokens without meaning
 */
function removeFillerPhrases(content: string): string {
  const fillers = [
    /\b(it is )?important to\s+/gi,
    /\b(you should )?always remember to\s+/gi,
    /\b(please )?make sure to\s+/gi,
    /\b(be )?sure to\s+/gi,
    /\bin order to\s+/gi,
    /\b(so )?that (you|we) can\s+/gi,
  ];
  let result = content;
  for (const re of fillers) {
    result = result.replace(re, '');
  }
  return result;
}

/**
 * Deduplicate repeated bullet points across content (same line appears multiple times)
 */
function deduplicateBullets(content: string): string {
  const lines = content.split('\n');
  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of lines) {
    const normalized = line.replace(/^[\s\-*]+/, '').trim().toLowerCase();
    if (normalized.length < 5) {
      result.push(line);
      continue;
    }
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(line);
  }

  return result.join('\n');
}

/**
 * Trim trailing whitespace from each line
 */
function trimLines(content: string): string {
  return content
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');
}

/**
 * Remove redundant "Rules" / "Guidelines" headers that repeat the section title
 */
function removeRedundantHeaders(content: string): string {
  return content.replace(/^##\s+(Rules|Guidelines|Checklist)\s*\n+/gm, '');
}

/**
 * Compress rule content using heuristic redundancy removal.
 * Targets ~30-50% token reduction with minimal semantic loss.
 */
export function compressRuleContent(content: string): string {
  let result = content;

  result = stripFrontmatter(result);
  result = removeRedundantHeaders(result);
  result = removeFillerPhrases(result);
  result = deduplicateBullets(result);
  result = trimLines(result);
  result = collapseBlankLines(result);

  return result.trim();
}

/**
 * Compress multiple rule contents and merge with minimal redundancy.
 * Adds file markers for traceability.
 */
export function compressRules(rules: Array<{ path: string; content: string }>): string {
  const compressed = rules.map(({ path, content }) => {
    const body = compressRuleContent(content);
    return `<!-- ${path} -->\n${body}`;
  });

  return compressed.join('\n\n');
}
