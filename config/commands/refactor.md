---
description: Code refactoring slash command
keywords: [refactor, clean, improve, simplify]
---

# /refactor

When asked to refactor code:

1. **Analyze first** — Read the entire file before making changes
2. **Identify issues** — List specific problems (duplication, complexity, naming)
3. **Propose changes** — Explain what you'll change and why
4. **Preserve behavior** — Refactoring must not change functionality
5. **Verify** — Run existing tests after refactoring

## Refactoring Checklist
- Extract repeated code into functions
- Simplify nested conditionals (guard clauses, early returns)
- Rename unclear variables and functions
- Split large functions (> 50 lines)
- Split large files (> 300 lines)
- Remove dead code
- Replace magic numbers with named constants

## Rules
- Make one type of change at a time
- Keep each change small and reviewable
- Don't add features during refactoring
- Don't change formatting during logic refactoring
- If tests don't exist, write them before refactoring
