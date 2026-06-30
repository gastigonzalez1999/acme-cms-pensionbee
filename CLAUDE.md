# Acme CMS — Claude Code Instructions

## Project overview

Full-stack JavaScript content management system for Acme Co.'s marketing department.

- **Backend**: NestJS + TypeScript (port 3000, Swagger at `/docs`)
- **Frontend**: Vite + React + TypeScript + Tailwind CSS (port 5173)
- **Content**: Markdown files in `content/` at the repo root; `template.html` alongside them

## Key commands

```bash
python dev.py              # start both services (one command)
npm test --workspaces      # run all tests
npm run test:e2e           # Playwright E2E (boots both services via playwright.config.ts)
npm run typecheck --workspaces  # tsc --noEmit across both apps
npm run build --workspaces      # production builds

# In apps/api/
npm test                   # jest unit tests (src/**/*.spec.ts)
npm run test:e2e           # jest integration tests (test/*.e2e-spec.ts)
npm run start:dev          # NestJS watch mode

# In apps/web/
npm test                   # vitest unit tests
npm run dev                # Vite dev server
```

## Project structure

```
/
├── content/               # marketing content — one folder per page, each with index.md
│   ├── about-page/
│   │   └── index.md
│   └── ...
├── template.html          # page shell with {{title}} and {{content}} placeholders
├── e2e/                   # Playwright end-to-end specs (boots API + web)
│   └── content.e2e.spec.ts
├── playwright.config.ts   # Playwright configuration
├── apps/
│   ├── api/               # NestJS content service
│   │   └── src/
│   │       ├── content/   # ContentModule (source, service, controller, render)
│   │       ├── common/    # exception filter, env validation
│   │       └── health/    # /healthz
│   └── web/               # Vite + React SPA
│       └── src/
│           └── components/ # Layout, ContentPage, HomePage, NotFound
├── docs/adr/              # Architecture Decision Records
├── dev.py                 # one-command orchestrator
├── render.yaml            # Render.com service definition (API)
└── apps/web/vercel.json   # Vercel SPA rewrites
```

## Skills available for this project

### /qa-sweep (project skill)
Structured pre-deployment QA pass: runs all automated tests, probes the live API for edge cases
and bugs, then drives the SPA in a real browser via Chrome DevTools MCP.
See `.claude/skills/qa-sweep/SKILL.md`.

### /pr-review (project skill)
Self-review a branch diff before opening a pull request. Checks correctness, security, test
coverage, maintainability, and API contracts. Returns Must fix / Should fix / Consider findings
and a single merge verdict.
See `.claude/skills/pr-review/SKILL.md`.

### /test-gaps (project skill)
Analyse a module or file, map every code path, identify untested branches, and write the missing
tests in the project's existing test style. Reports what was added.
See `.claude/skills/test-gaps/SKILL.md`.

### /adr (project skill)
Write an Architecture Decision Record for a technical decision. Prompts for context, alternatives,
and tradeoffs; writes a concise ADR to `docs/adr/`.
See `.claude/skills/adr/SKILL.md`.

### Global skills usable here
- **`/qa`** — conversational QA session: describe a bug, agent files a GitHub issue.
- **`/browser-use`** — drives Chrome via Chrome DevTools MCP (live site verification).
  **Note:** this is what "Playwright MCP" means in this project — the connected browser tool is
  Chrome DevTools MCP, not the @playwright/test runner. The `@playwright/test` runner (in `e2e/`)
  is automated specs that run headlessly; Chrome DevTools MCP is interactive browser driving.
- **`/thermo-nuclear-code-quality-review`** — harsh maintainability audit.
- **`/domain-model`** — stress-test plans against the domain model.

## Content source swapping

To swap the filesystem source for a CMS or database:
1. Implement `ContentSource` interface (`apps/api/src/content/source.ts`)
2. Change `useFactory` in `ContentModule` to return the new implementation
3. Zero changes to `ContentService` or `ContentController`

## Environment variables

Copy `.env.example` to `.env` in the repo root (or set vars in your shell):

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `3000` | NestJS listen port |
| `CONTENT_DIR` | `../../content` | Absolute or relative to `apps/api/` |
| `TEMPLATE_PATH` | `../../template.html` | Same relative base |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated in production |
| `VITE_API_BASE_URL` | `` (empty = same origin proxy) | Set to Render URL in Vercel |

## NestJS gotchas (don't repeat these)

- **CORS default**: set it in the `EnvironmentVariables` class (`env.validation.ts`), not only
  in `.env`. Read it in `main.ts` via `ConfigService`, not `process.env` directly — the validated
  class default won't apply otherwise.
- **ConfigModule + validate**: the `validate` function receives `process.env` at module compile
  time. To override in e2e tests, use `overrideProvider(CONTENT_SOURCE)` rather than setting
  env vars and hoping ConfigModule picks them up — that timing is unreliable.
- **Wildcard routes** (`*path`): NestJS 11 named wildcards don't capture slashes reliably with
  the Express adapter. Use the `@Slug(prefix)` param decorator in `content.controller.ts`, which
  extracts from `req.url` directly. See docs/LEARNINGS.md for the full story.
- **noImplicitAny is false** in tsconfig — deliberate NestJS scaffold default. Enable it per-file
  with `// @ts-strict` if you want stricter checking in new files.
- **ts-jest + nodenext**: unit tests override `module: commonjs` and `moduleResolution: node` in
  the jest transform config. This avoids the `resolvePackageJsonExports` conflict.
- **String.replace with dynamic content**: use `template.replace('{{x}}', () => value)` (function
  form), never `template.replace('{{x}}', value)` — the string form interprets `$&`, `$1`, etc.
  as replacement patterns and corrupts content containing those sequences.

## Test isolation

Integration (e2e) tests never touch the sample `content/` folder:
- They create a temp directory in `beforeAll`, write fixture markdown, and call
  `module.overrideProvider(CONTENT_SOURCE).useValue(new FileSystemContentSource(tmpDir))`
- This means content folders can be added/removed without breaking tests

## Template placeholders

`template.html` contains two placeholders:
- `{{title}}` — replaced with the page's H1 heading (or "Welcome to Acme" fallback)
- `{{content}}` — replaced with the sanitized HTML rendered from `index.md`

Both are substituted using replacement functions (not string literals) to avoid `$&`/`$1`
corruption.

## Adding a new content page

Drop a folder with an `index.md` into `content/`:
```bash
mkdir content/my-new-page
echo "# My New Page\n\nContent here." > content/my-new-page/index.md
```
It immediately appears at `/my-new-page` (no restart needed in dev).

## Deployment

- **API → Render**: `docker build -f apps/api/Dockerfile . && docker push` (or via `render.yaml` auto-deploy).
  The Dockerfile uses the workspace root `package-lock.json` — build context must be the repo root.
- **Web → Vercel**: `cd apps/web && vercel deploy --prod` (or via Vercel Git integration)
- After deploying, set `CORS_ORIGIN` on Render to the Vercel URL, and `VITE_API_BASE_URL` on Vercel to the Render URL.
