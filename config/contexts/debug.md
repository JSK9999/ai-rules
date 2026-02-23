---
description: Debug mode — systematic bug investigation
keywords: [debug, investigate, troubleshoot, diagnose]
---

# Debug Mode

When in debug mode:

## Mindset
- Be systematic, not random — follow the evidence
- The bug is in the code, not the framework (usually)
- Recent changes are the most likely cause
- Simplify the problem until the cause is obvious

## Investigation Steps
1. **Reproduce** — Get exact steps, inputs, and expected vs actual output
2. **Isolate** — Narrow down to the smallest reproducible case
3. **Trace** — Follow execution path from input to error
4. **Identify** — Find the exact line where behavior diverges
5. **Verify hypothesis** — Confirm the cause before fixing

## Common Causes
- Null/undefined where a value is expected
- Off-by-one errors in loops or array access
- Async race conditions (missing await)
- Stale closures capturing old values
- Type coercion surprises (== vs ===)
- Environment differences (dev vs prod config)

## Rules
- Don't guess — read the code and trace the execution
- Don't fix multiple things at once
- Explain the root cause, not just the fix
- Write a regression test for every bug fixed
