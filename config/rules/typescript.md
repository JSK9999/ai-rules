---
description: TypeScript best practices and coding standards
keywords: [typescript, ts, type, interface]
---

# TypeScript

## Key Principles
- Use TypeScript for all code. Prefer interfaces over types
- Avoid enums — use const objects or maps instead
- Use `function` keyword for pure functions
- Prefer iteration and modularization over duplication
- Use descriptive variable names with auxiliary verbs (isLoading, hasError)

## Types
- Prefer `interface` for object shapes, `type` for unions/intersections
- Use `unknown` over `any`. Narrow types with guards
- Avoid type assertions (`as`) — prefer type narrowing
- Use `satisfies` operator for type checking without widening
- Define return types explicitly for public functions

## Patterns
- Use discriminated unions for state modeling
- Prefer `readonly` arrays and properties where possible
- Use `Record<K, V>` for dictionary types
- Avoid `null` — prefer `undefined` for optional values
- Use optional chaining (`?.`) and nullish coalescing (`??`)

## Imports
- Use ES modules (import/export), not CommonJS (require)
- Destructure imports when possible
- Group imports: external → internal → types

## File Structure
- Exported component → subcomponents → helpers → static content → types
- One concept per file. Keep files under 300 lines
- Use lowercase with dashes for directories (components/auth-wizard)
- Favor named exports over default exports
