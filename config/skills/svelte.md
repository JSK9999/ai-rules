---
description: Svelte 5 and SvelteKit best practices
keywords: [svelte, sveltekit]
---

# Svelte 5

## Key Principles
- Use runes (`$state`, `$derived`, `$effect`) for reactivity
- Use TypeScript with `<script lang="ts">`
- Keep components small — extract logic into modules
- Use SvelteKit for routing and SSR

## Runes (Svelte 5)
- `$state()` for reactive variables
- `$derived()` for computed values (replaces `$:`)
- `$effect()` for side effects (use sparingly)
- `$props()` for component props
- `$bindable()` for two-way binding props

## Components
- One component per `.svelte` file
- Use `{#snippet}` for reusable template fragments
- Use `{@render}` to render snippets
- Props: `let { title, count = 0 } = $props()`

## SvelteKit
- Use `+page.svelte` for pages, `+layout.svelte` for layouts
- Use `+page.server.ts` for server-side data loading
- Use form actions for mutations
- Use `$app/navigation` for programmatic navigation

## Structure
```
src/
  lib/
    components/
    utils/
  routes/
    +page.svelte
    +layout.svelte
    api/
```

## Best Practices
- Prefer server-side loading over client-side fetch
- Use `{#each}` with `key` for lists
- Avoid `$effect` for derived state — use `$derived`
- Use CSS scoping (default in Svelte)
