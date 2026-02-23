---
description: Testing best practices and conventions
keywords: [test, testing, unit, integration, e2e, vitest, jest]
---

# Testing

## Principles
- Write tests first when fixing bugs (TDD for bug fixes)
- Test behavior, not implementation details
- Each test should have a single reason to fail
- Keep tests independent — no shared mutable state

## Structure
- Use AAA pattern: Arrange → Act → Assert
- Use descriptive test names: "should return error when input is empty"
- Group related tests with `describe` blocks
- Keep test files next to source: `foo.ts` → `foo.test.ts`

## What to Test
- Unit tests for pure functions and utilities
- Integration tests for API endpoints and database queries
- E2E tests for critical user flows only
- Edge cases: empty input, null, boundaries, error paths

## What NOT to Test
- Third-party library internals
- Trivial getters/setters
- Framework boilerplate
- Implementation details that may change

## Practices
- Prefer real objects over mocks when practical
- Use factories or builders for test data, not fixtures
- Run single tests during development, full suite in CI
- Aim for 80% coverage, but don't chase 100%
- Failing test first, then make it pass, then refactor
