# Acme CMS

A full-stack content management system for Acme Co.'s marketing department.  
The brief, the original challenge description, and sample content are from [PensionBee's static content challenge](https://github.com/PensionBee/static-content-challenge-2025).

**Live deployment:**
- 🌐 **Web app:** https://acme-cms-pensionbee-web-beta.vercel.app
- 🔌 **API / Swagger:** https://acme-cms-api.onrender.com/docs

---

## What it does

Marketing staff drop a folder with an `index.md` into `content/` and it immediately becomes a page at that URL. No code changes. No restart needed in production.

```
content/about-page/index.md      →  /about-page
content/blog/june/update/index.md →  /blog/june/update
```

## Architecture

```
┌──────────────────────┐       GET /api/content/*      ┌───────────────────────┐
│  React SPA (Vercel)  │  ──────────────────────────►  │  NestJS API (Render)  │
│  Vite + Tailwind     │       GET /api/pages           │  Port 3000            │
└──────────────────────┘                               └───────────────────────┘
                                                               │
                                                               ▼
                                                        content/*.md files
                                                        template.html
```

Two services, two hosts:
- **API (NestJS):** Renders markdown → HTML, serves content as JSON or full HTML. Deployed as a Docker container on Render.
- **Web (Vite + React + Tailwind):** Styled SPA, fetches content from the API. Deployed as a static site on Vercel.

See [docs/adr/0001-decoupled-api-spa.md](docs/adr/0001-decoupled-api-spa.md) for the full architectural rationale.

## Quick start

```bash
git clone <your-repo-url>
cd acme-cms

python dev.py   # starts API (3000) + Web (5173) with one command
```

Requires Node.js 18+ and Python 3.8+. Optional: `pip install python-dotenv`.

Visit [http://localhost:5173](http://localhost:5173) for the web app,  
or [http://localhost:3000/docs](http://localhost:3000/docs) for the API's Swagger UI.

## Adding content pages

Drop a folder with an `index.md` into `content/`:

```bash
mkdir content/new-page
echo "# New Page\n\nContent here." > content/new-page/index.md
```

The page appears at `/new-page` immediately — no code changes required.  
See [docs/CONTENT-AUTHORING.md](docs/CONTENT-AUTHORING.md) for the full guide.

## API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/content/:slug*` | Page content as JSON `{ slug, title, html }` |
| `GET` | `/pages/:slug*` | Full HTML page (template + rendered markdown) |
| `GET` | `/api/pages` | List all available pages |
| `GET` | `/sitemap.xml` | XML sitemap for crawlers |
| `GET` | `/rss.xml` | RSS 2.0 feed of all content pages |
| `GET` | `/healthz` | Health check |
| `GET` | `/docs` | Swagger / OpenAPI |

## Testing

```bash
# Run all tests
npm test --workspaces

# API: unit + integration (e2e)
cd apps/api && npm test && npm run test:e2e

# Web: component tests
cd apps/web && npm test

# Playwright E2E (boots both services automatically)
npm run test:e2e
```

**Test count:** 38 unit tests + 16 integration tests + 6 component tests = **60 tests total** (+ Playwright E2E)

The three brief-required tests are in `apps/api/test/content.e2e-spec.ts`:
- `GET /pages/test-page → 200` for a valid URL
- Body contains `<h1>Test Page Title</h1>` (rendered from fixture `index.md`)
- `GET /pages/non-existent → 404`

Tests use a temporary fixture directory — they never depend on the sample `content/` folders and won't break as content changes.

## Documentation

- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — full dev setup and project layout
- [docs/CONTENT-AUTHORING.md](docs/CONTENT-AUTHORING.md) — guide for marketing staff
- [docs/LEARNINGS.md](docs/LEARNINGS.md) — gotchas and lessons from the build
- [docs/FINDINGS.md](docs/FINDINGS.md) — known limitations and deferred P2 findings
- [docs/adr/](docs/adr/) — Architecture Decision Records

## How to iterate from here

| What | How |
|---|---|
| Add a new content source (CMS, DB) | Implement `ContentSource` interface; swap in `ContentModule` |
| Better SEO | The API's `/pages/*` already returns server-rendered HTML; add a Next.js frontend to replace the SPA and call the same API server-side |
| Auth for protected pages | Add a `@nestjs/passport` guard to selected routes |
| Content previews / drafts | Add a `status` flag to the source abstraction; render drafts only with a preview token |
| Scale the API | Swap Render for ECS/Fly; the Docker image is already multi-stage |

## Tech stack

| Layer | Technology |
|---|---|
| Backend | NestJS 11, TypeScript, Express |
| Content rendering | markdown-it + sanitize-html |
| Frontend | React 19, Vite 8, React Router 7, Tailwind CSS 4 |
| API docs | Swagger / OpenAPI (`@nestjs/swagger`) |
| Testing | Jest + Supertest (API), Vitest + RTL + MSW (Web) |
| CI | GitHub Actions |
| Deployment | Render (API container) + Vercel (static SPA) |
