---
description: Pull request title format, description template, and PR size principles
---

# Pull Request Guidelines

## Title Format

```
[TICKET-ID] <One-line Summary>
```

Examples:
- `[PP-1234] Add user authentication system`
- `[PP-5678] Fix payment module bug`

## Description Template

```markdown
#### Issue Type
- [ ] Feature (feat)
- [ ] Bug fix (fix)
- [ ] Refactoring (refactor)
- [ ] Performance (perf)
- [ ] Chore

#### Background
> What and why

#### Changes
> List major modifications

**API Changes:**
- [ ] No Breaking Changes
- [ ] Breaking Changes

**Major Changed Files:**
- `path/file.ext` - Summary

#### Testing
- [ ] Unit tests pass
- [ ] Manual testing confirmed

#### Checklist
- [ ] Self-review completed
- [ ] No secrets included
- [ ] Commit messages follow conventions
```

## Size Principles

- Keep PRs small and focused
- Each PR should be independently buildable/testable
- Separate into logical units
