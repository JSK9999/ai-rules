---
description: Next.js App Router and React best practices
keywords: [nextjs, next, react, app-router, rsc, server-components]
---

# Next.js / React

## Key Principles
- Use functional components with TypeScript interfaces
- Minimize `use client` — prefer Server Components and SSR
- Use `use client` only for Web API access in small components
- Rely on Next.js App Router for state changes

## Components
- Use `function` keyword, not `const`, for components
- Place static content and interfaces at file end
- Wrap client components in Suspense with fallback
- Use dynamic loading for non-critical components

## Data Fetching
- Fetch data in Server Components, not client
- Use Server Actions for mutations
- Model expected errors as return values in Server Actions
- Avoid `useEffect` for data fetching

## State Management
- Minimize `useEffect` and `setState`
- Favor RSC (React Server Components) for data
- Use `useActionState` with react-hook-form for forms
- Use Zod for form validation

## Styling
- Use Tailwind CSS with mobile-first approach
- Use Shadcn UI and Radix UI for components
- Use `cn()` utility for conditional classes

## Performance
- Prioritize Web Vitals (LCP, CLS, FID)
- Optimize images: WebP format, size data, lazy loading
- Use `next/image` for all images
- Use `next/font` for font optimization
