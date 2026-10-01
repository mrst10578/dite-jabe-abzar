# starter-web

A clean, production-oriented Next.js starter for client websites and general web apps.

## What this starter is for

Use this repository when the project is a normal website or web application and does not need a more specialized starter such as SaaS, AI, CMS, or Learning.

## Core stack

- Next.js 16.3.5
- React 19.2.8
- TypeScript 5.x
- Tailwind CSS 4.3.3
- shadcn-compatible component structure
- Vitest unit tests
- Playwright E2E smoke tests
- GitHub Actions CI

React is intentionally pinned to the version used by the current official create-next-app template instead of automatically chasing the newest React release.

## Included

- App Router
- strict TypeScript
- responsive starter page
- SEO metadata baseline
- robots + sitemap
- loading, error, and not-found states
- accessible UI button primitive
- Tailwind class utility
- ESLint
- unit test baseline
- E2E smoke test
- CI verification
- AI coding rules in `AGENTS.md`

## Not included

These belong to feature packs and must be added only when the project needs them:

- authentication
- database
- storage
- payments
- CMS
- AI / RAG
- analytics
- monitoring
- search
- email

## Start a project

1. Create a new repository from this template.
2. Copy `.env.example` to `.env.local`.
3. Install dependencies:

```bash
npm install
```

4. Run:

```bash
npm run dev
```

## Verification

```bash
npm run verify
npm run test:e2e
```

The GitHub Actions workflow runs lint, typecheck, unit tests, production build, and Chromium E2E smoke tests.

## Feature packs

The source of truth for optional capabilities lives in the separate `pro-web-toolkit` repository. Add only the packs required by the client brief.

<!-- TOOLKIT-LINK:BEGIN -->

## Professional Web Toolkit

This repository is the **starter-web** starter in the private Professional Web Toolkit.

- Toolkit source of truth: `mrst10578/pro-web-toolkit`
- Starter registry key: `starter-web`
- Starter version: `0.1.0`
- Maturity: `experimental`
- Optional capabilities come from Feature Packs in the toolkit; do not hard-code unused providers into this starter.
- Repository-specific wiring metadata: `starter.yml`
- Composition rules: `TOOLKIT.md`

<!-- TOOLKIT-LINK:END -->
