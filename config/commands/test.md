---
description: Test generation slash command
keywords: [test, generate, spec, unit]
---

# /test

When asked to write tests:

1. **Read the source** — Understand what the code does before writing tests
2. **Identify cases** — Happy path, edge cases, error cases
3. **Write tests** — Use AAA pattern (Arrange, Act, Assert)
4. **Run tests** — Verify they pass
5. **Check coverage** — Ensure critical paths are covered

## Test Structure
```typescript
describe('functionName', () => {
  it('should return X when given Y', () => {
    // Arrange
    const input = createInput();

    // Act
    const result = functionName(input);

    // Assert
    expect(result).toBe(expected);
  });

  it('should throw when input is invalid', () => {
    expect(() => functionName(null)).toThrow();
  });
});
```

## What to Cover
- Normal inputs → expected outputs
- Empty/null/undefined inputs
- Boundary values (0, -1, MAX)
- Error conditions and exceptions
- Async operations (resolve and reject)

## Rules
- One assertion per test (when practical)
- No test interdependence — each test runs independently
- Use descriptive names: "should [expected] when [condition]"
- Don't test private/internal methods directly
