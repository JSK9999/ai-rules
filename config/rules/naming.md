---
description: Naming conventions for variables, functions, and files
keywords: [naming, convention, variable, function]
---

# Naming Conventions

## Variables
- Use descriptive names with auxiliary verbs: `isLoading`, `hasError`, `canSubmit`
- Boolean: prefix with `is`, `has`, `can`, `should`
- Arrays: use plural nouns (`users`, `items`)
- Numbers: prefix with `num`, `max`, `min`, `total` (`maxRetries`, `totalCount`)

## Functions
- Use verbs: `getUser`, `createOrder`, `validateInput`
- Event handlers: `handleClick`, `onSubmit`
- Return boolean: `isValid`, `hasPermission`, `canAccess`
- Async functions: describe the result, not the mechanism (`fetchUser`, not `asyncGetUser`)

## Files and Directories
- Use lowercase with dashes: `auth-wizard.ts`, `user-profile/`
- Component files match component name: `UserProfile.tsx`
- Test files: `user-profile.test.ts`
- Types: `user.types.ts` or co-locate with source

## Constants
- UPPER_SNAKE_CASE for true constants: `MAX_RETRIES`, `API_BASE_URL`
- camelCase for const references: `const defaultConfig = { ... }`

## Avoid
- Single letter names (except `i` in loops, `e` in event handlers)
- Abbreviations: `btn`, `usr`, `msg` → `button`, `user`, `message`
- Generic names: `data`, `info`, `item`, `thing`
- Hungarian notation: `strName`, `bIsActive`
- Negated booleans: `isNotReady` → `isReady`
