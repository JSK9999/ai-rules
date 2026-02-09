---
description: Code review guide - functionality, quality, security, performance, testing checklist
---

# Code Review Guide

## Review Checklist

### Functionality
- [ ] Correctly implements requirements
- [ ] Edge cases handled
- [ ] Error handling appropriate

### Code Quality
- [ ] Readable and maintainable
- [ ] No code duplication
- [ ] Clear naming conventions
- [ ] Appropriate comments (not excessive)

### Security
- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] No SQL injection/XSS/CSRF vulnerabilities
- [ ] Authentication/authorization checks

### Performance
- [ ] No unnecessary re-renders
- [ ] Efficient algorithms
- [ ] No memory leaks
- [ ] Appropriate caching

### Testing
- [ ] Unit tests for new code
- [ ] Edge cases tested
- [ ] Tests are meaningful (not just coverage)

## Review Comments

- Be specific and actionable
- Explain "why", not just "what"
- Suggest alternatives when criticizing
- Praise good patterns
