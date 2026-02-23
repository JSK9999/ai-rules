---
description: Error handling patterns and best practices
keywords: [error, exception, handling, try, catch]
---

# Error Handling

## Principles
- Handle errors at the beginning of functions
- Use early returns for error conditions to avoid deep nesting
- Place the happy path last for readability
- Use guard clauses for preconditions and invalid states

## Patterns
- Avoid unnecessary else — use if-return pattern
- Use custom error types for domain-specific errors
- Model expected errors as return values, not exceptions
- Use error boundaries for unexpected errors (React error.tsx)

## Do
```typescript
function process(input: string): Result {
  if (!input) return { error: 'Input required' };
  if (input.length > MAX) return { error: 'Too long' };

  // Happy path
  const result = transform(input);
  return { data: result };
}
```

## Don't
```typescript
function process(input: string): Result {
  if (input) {
    if (input.length <= MAX) {
      const result = transform(input);
      return { data: result };
    } else {
      return { error: 'Too long' };
    }
  } else {
    return { error: 'Input required' };
  }
}
```

## Logging
- Log errors with enough context to reproduce
- Include: what failed, input values, stack trace
- Never log sensitive data (passwords, tokens, PII)
- Use structured logging (JSON) in production
