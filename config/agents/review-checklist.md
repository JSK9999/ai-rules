---
name: Review Checklist
description: Code review checklist for quality, security, testing, and performance
keywords: [리뷰, review, 검토, 레뷰, checklist, code quality, security, testing, performance, documentation]
---

# Review Checklist

## Code Quality

### Size Limits
- [ ] File size ≤ 300 LOC
- [ ] Function size ≤ 50 LOC
- [ ] Parameters ≤ 5
- [ ] Cyclomatic complexity ≤ 10
- [ ] Split/refactor if limits exceeded

### Clean Code
- [ ] Intention-revealing names used
- [ ] Each function does one thing
- [ ] Side effects isolated to boundary layers
- [ ] Guard clauses preferred
- [ ] Constants symbolized (no hardcoding)
- [ ] Code structured as Input → Processing → Return

## Functionality Review

- [ ] Correctly implements requirements
- [ ] Edge cases handled
- [ ] Error handling is appropriate
- [ ] No unintended side effects

## Security Review

- [ ] No secrets in code
- [ ] Inputs validated and sanitized
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Authentication/authorization applied
- [ ] See [security-rules.md](./security-rules.md) for full checklist

## Testing Review

- [ ] New code has tests
- [ ] Bug fixes have regression tests
- [ ] Tests are deterministic
- [ ] E2E has success and failure paths
- [ ] See [testing-rules.md](./testing-rules.md) for full checklist

## Performance Review

- [ ] No obvious performance issues
- [ ] Database queries optimized
- [ ] No N+1 query problems
- [ ] Appropriate caching considered

## Documentation Review

- [ ] Complex logic is documented
- [ ] API changes documented
- [ ] README updated if needed
- [ ] Breaking changes noted

## Reviewer Actions

1. **Read**: Understand the context and purpose
2. **Verify**: Check against requirements
3. **Test**: Run tests locally if needed
4. **Comment**: Provide constructive feedback
5. **Approve/Request Changes**: Make clear decision
