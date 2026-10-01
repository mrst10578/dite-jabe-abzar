# AI Engineering Rules

This repository is the general-purpose web starter for the Professional Web Toolkit.

## Goal

Keep this starter small, reliable, and reusable for real client work.

## Core architecture

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn-compatible components in `src/components/ui`
- shared helpers in `src/lib`

## Rules

1. Do not add auth, database, storage, payments, CMS, AI, analytics, monitoring, search, or email to core.
2. Optional business capabilities come from feature packs.
3. Do not add a dependency without a current requirement.
4. Prefer Server Components. Add `"use client"` only when browser state/effects are required.
5. Keep accessibility, responsive behavior, loading, empty, error, and not-found states explicit.
6. Keep secrets server-only.
7. Do not weaken TypeScript or lint rules to make a change pass.
8. Before shipping, run:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test`
   - `npm run build`
   - `npm run test:e2e`
9. Preserve the `@/* -> ./src/*` import alias.
10. New reusable UI should follow the existing `cn` + variant pattern and remain compatible with shadcn conventions.

## Scope test

If a proposed change describes a reusable product capability rather than the general web foundation, it probably belongs in a feature pack instead of this starter.
