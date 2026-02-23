---
description: Vue 3 Composition API best practices
keywords: [vue, vuejs, nuxt, composition-api]
---

# Vue 3

## Key Principles
- Use Composition API with `<script setup>` syntax
- Use TypeScript with `defineProps` and `defineEmits`
- Keep components small and focused
- Use composables for reusable logic

## Components
- One component per file (SFC: .vue)
- Use PascalCase for component names: `UserProfile.vue`
- Props: use type-safe `defineProps<{ title: string }>()`
- Emits: use `defineEmits<{ (e: 'update', value: string): void }>()`

## Reactivity
- Use `ref()` for primitives, `reactive()` for objects
- Use `computed()` for derived state
- Use `watch()` sparingly — prefer computed
- Avoid mutating props — emit events instead

## Composables
- Name with `use` prefix: `useAuth`, `useFetch`
- Return reactive refs and functions
- Keep composables pure — no side effects in setup
- Extract shared logic into `/composables/` directory

## Structure
```
src/
  components/     # Shared components
  composables/    # Reusable logic
  views/          # Page components
  stores/         # Pinia stores
  types/          # TypeScript types
```

## State Management
- Use Pinia for global state
- Keep stores small and domain-specific
- Use `storeToRefs()` for destructuring reactive state
