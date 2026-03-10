---
description: Tailwind CSS utility-first styling best practices
keywords: [tailwind, tailwindcss, css, utility-first, styling]
---

# Tailwind CSS Best Practices

## When to Apply
- Styling components with Tailwind utility classes
- Configuring themes and design tokens
- Implementing responsive or dark mode layouts
- Optimizing production CSS output

## Critical Rules

### 1. Utility-First Workflow
- Compose designs directly in markup with utility classes
- Avoid premature abstraction — inline utilities first, extract later
- Follow consistent class ordering: layout → sizing → spacing → typography → visual → state
- Use official Prettier plugin (`prettier-plugin-tailwindcss`) to auto-sort classes

### 2. Responsive Design
- Use mobile-first breakpoints: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- Prefer `min-width` breakpoints; use `max-*:` variants sparingly
- Use container queries (`@container`, `@sm:`, `@lg:`) for component-level responsiveness
- Group responsive variants logically: `flex flex-col md:flex-row md:items-center`

### 3. Custom Theme Configuration
- Extend the default theme via `tailwind.config.js` / `tailwind.config.ts`
- Define design tokens for colors, spacing, and fonts under `theme.extend`
- Use CSS variables for dynamic theming: `--color-primary` mapped in config
- Keep config minimal — extend rather than override the defaults

### 4. Component Extraction & @apply
- Extract only when a pattern repeats ≥ 3 times across files
- Prefer component abstractions (React, Vue, etc.) over `@apply`
- If `@apply` is needed, keep rules in a dedicated layer: `@layer components { ... }`
- Never use `@apply` for one-off styles — use inline utilities instead

### 5. Dark Mode
- Use `class` strategy for user-controlled toggling: `darkMode: 'class'`
- Use `media` strategy when OS preference is sufficient
- Apply dark variants consistently: `bg-white dark:bg-gray-900`
- Define semantic color tokens that map to light/dark values

### 6. Performance & Production
- Enable JIT mode (default in Tailwind v3+)
- Configure `content` paths to include all template files for tree-shaking
- Avoid dynamic class construction: `bg-${color}-500` — use safelist or full classes
- Remove unused base/component layers if not needed: `@tailwind base;`

## File Structure
```
project/
  tailwind.config.ts    # Theme, plugins, content paths
  postcss.config.js     # PostCSS with tailwindcss + autoprefixer
  src/
    styles/
      globals.css       # @tailwind directives, custom @layer rules
    components/         # UI components using utility classes
```

## Common Pitfalls
- Don't use string interpolation for class names — breaks tree-shaking
- Don't override the entire theme — use `theme.extend` to preserve defaults
- Don't mix Tailwind utilities with large custom CSS files — pick one approach
- Don't forget `content` config — missing paths cause styles to be purged
