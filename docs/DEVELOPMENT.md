# Development Guide

## Prerequisites

- **Node.js 22** (or 18+): https://nodejs.org
- **Python 3.8+** (for dev.py): https://python.org
- **Optional**: `pip install python-dotenv` — auto-loads `.env` from dev.py

## Quick start

```bash
git clone <your-repo-url>
cd acme-cms

cp .env.example .env   # adjust if needed; defaults work for local dev

python dev.py          # starts API (3000) + Web (5173)
```

Visit http://localhost:5173 to see the SPA, or http://localhost:3000/docs for the API's Swagger UI.

## Running services individually

```bash
# API only
cd apps/api
npm install
npm run start:dev   # watch mode

# Web only
cd apps/web
npm install
npm run dev
```

## Tests

```bash
# Run all tests
npm test --workspaces

# API unit tests only
cd apps/api && npm test

# API integration (e2e) tests
cd apps/api && npm run test:e2e

# Web component tests
cd apps/web && npm test

# Typecheck both apps
npm run typecheck --workspaces

# Playwright E2E (boots both services automatically via playwright.config.ts)
npm run test:e2e   # from repo root
```

Note: `npm run test:e2e` from the repo root runs Playwright. `npm run test:e2e` from `apps/api/` runs
the Jest integration suite. They're separate runners — both are important.

## Project layout

```
/
├── content/               # One folder per page, each with index.md
├── template.html          # HTML shell with {{title}} and {{content}} placeholders
├── e2e/                   # Playwright end-to-end specs (boots API + web)
│   └── content.e2e.spec.ts
├── playwright.config.ts   # Playwright configuration (webServer: API + web)
├── apps/
│   ├── api/               # NestJS API (port 3000)
│   │   ├── src/
│   │   │   ├── content/   # Core business logic: source, render, service, controller
│   │   │   ├── common/    # Global exception filter, env validation
│   │   │   └── health/    # GET /healthz
│   │   └── test/          # Integration tests (supertest)
│   └── web/               # Vite + React SPA (port 5173)
│       └── src/
│           ├── components/ # Layout, HomePage, ContentPage, NotFound
│           ├── design-system/ # tokens (CSS vars) + typed React primitives
│           └── lib/       # seo.ts, format.ts
├── .claude/skills/
│   └── qa-sweep/SKILL.md  # Project QA skill (run before deploying)
├── docs/
│   ├── adr/               # Architecture Decision Records
│   ├── DEVELOPMENT.md     # This file
│   ├── CONTENT-AUTHORING.md
│   ├── LEARNINGS.md       # Gotchas and lessons from the build
│   └── FINDINGS.md        # Known limitations / deferred P2 findings
├── .github/workflows/ci.yml
├── dev.py                 # One-command orchestrator
├── render.yaml            # Render.com infra-as-code (API)
└── apps/web/vercel.json   # Vercel SPA rewrites
```

## Environment variables

See `.env.example` for all variables. Key ones:

- `CONTENT_DIR`: absolute path to the content folder. Default: `../../content` (from `apps/api/`).
- `CORS_ORIGIN`: the SPA's origin, comma-separated for multiple values. Set in production to the Vercel URL.
- `VITE_API_BASE_URL`: the API's base URL (used by the SPA in production). Set in Vercel dashboard.

## Adding a new API feature

1. Create or extend a NestJS module in `apps/api/src/`
2. Write unit tests in `src/<module>/<name>.spec.ts`
3. Write integration tests in `test/<name>.e2e-spec.ts`
4. Run `npm run typecheck` in `apps/api/` before committing

## Linting and formatting

```bash
cd apps/api && npm run lint     # ESLint + Prettier
cd apps/web && npm run lint     # oxlint
```

## Playwright E2E

Install Playwright browsers once before running E2E tests locally:

```bash
npx playwright install chromium
```

Then run from the repo root:

```bash
npm run test:e2e
```

Playwright starts both services automatically via the `webServer` config in `playwright.config.ts`.
Results are saved to `playwright-report/`. Open with `npx playwright show-report`.
