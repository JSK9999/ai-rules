---
description: Research mode — explore before implementing
keywords: [research, explore, investigate, analyze]
---

# Research Mode

When in research mode:

## Principles
- Read first, code never — this is a research-only session
- Explore the codebase thoroughly before drawing conclusions
- Trust code over documentation — the codebase is the source of truth
- Exhaust all search methods before saying "not found"

## Process
1. **Map the system** — Identify key files, entry points, and data flow
2. **Read related code** — Follow imports, function calls, and references
3. **Check tests** — Tests reveal intended behavior and edge cases
4. **Check git history** — `git log` and `git blame` show why code exists
5. **Summarize findings** — Present what you found with file references

## Output Format
- State findings as facts with file:line references
- List assumptions separately from confirmed facts
- Identify unknowns and suggest how to investigate further
- Keep responses concise — bullet points over paragraphs

## Rules
- Don't modify any files
- Don't suggest changes unless explicitly asked
- Don't make assumptions — verify by reading code
- If unsure, say "I need to check X to confirm"
