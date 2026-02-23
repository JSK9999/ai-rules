---
description: Debugging slash command
keywords: [debug, bug, fix, issue, error]
---

# /debug

When asked to debug an issue:

1. **Reproduce** — Understand the exact steps to trigger the bug
2. **Read error** — Analyze the full error message and stack trace
3. **Locate** — Find the exact line/function where the error originates
4. **Understand** — Read surrounding code to understand intended behavior
5. **Fix** — Make the minimal change to fix the root cause
6. **Verify** — Run tests or demonstrate the fix works

## Debugging Checklist
- Read the full error message and stack trace
- Check recent changes (git diff, git log)
- Verify inputs at the failure point
- Check for null/undefined values
- Check for type mismatches
- Check async/await and promise handling
- Check environment variables and config

## Rules
- Fix the root cause, not the symptom
- Don't add try/catch to hide errors
- Don't change unrelated code while debugging
- Write a test that reproduces the bug before fixing
- Explain what caused the bug and why the fix works
