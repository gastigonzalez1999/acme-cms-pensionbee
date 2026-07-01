# Known Limitations & Deferred Findings

Findings from the pre-submission code review that were deliberately deferred.  
Not bugs blocking correctness — conscious tradeoffs, documented for future iterations.

---

## P2 — Deferred (document, don't fix before submission)

### Caching inconsistency between `/pages/*` and `/api/content/*`

**Where:** `apps/api/src/content/content.controller.ts`

`GET /pages/*` sends `Cache-Control: public, max-age=60, stale-while-revalidate=300`.  
`GET /api/content/*` (the SPA's endpoint) sets no cache headers.

**Tension with the "appears immediately" claim:**  
The README says "The page appears at `/new-page` immediately." With `max-age=60`, the server-rendered route can serve a stale response for up to 60s (plus 300s stale-while-revalidate). This is fine for a CDN-cached marketing site but slightly tensions the claim.

**Why deferred:**  
The `max-age=60` is intentional for CDN performance. The "immediately" claim is accurate for the JSON API (no cache headers) and for the dev server. For production, add a cache-busting mechanism (URL versioning, `Cache-Control: no-cache` during `dev.py`, or a shorter max-age) if real-time updates become a requirement.

---

### `VITE_API_BASE_URL` trailing-slash edge case

**Where:** `apps/web/src/components/ContentPage.tsx:11`, `HomePage.tsx:9`

If `VITE_API_BASE_URL` is set with a trailing slash (e.g. `https://api.example.com/`), the fetch URL becomes `https://api.example.com//api/content/...` (double slash). Most HTTP servers handle this gracefully, but it's a robustness gap.

**Fix when it matters:** `(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')`

---

### SPA trust boundary: `dangerouslySetInnerHTML` trusts any `VITE_API_BASE_URL`

**Where:** `apps/web/src/components/ContentPage.tsx`

The SPA injects API-returned HTML via `dangerouslySetInnerHTML`. The HTML is sanitized server-side by `sanitize-html`. If `VITE_API_BASE_URL` is ever pointed at a malicious server, that sanitization is bypassed. This is a supply-chain/configuration concern, not a code bug.

**Documented, not fixed:** The trust boundary is one-hop (whoever controls the Render deployment controls the HTML). Accept for this scope; add a Content Security Policy if user-controllable redirects are ever added.

---

### Helmet's default CSP and Swagger at `/docs` — verified working

**Where:** `apps/api/src/main.ts`

Verified during pre-deploy QA: `@nestjs/swagger` serves all UI assets (`swagger-ui-bundle.js`, `swagger-ui-standalone-preset.js`, `swagger-ui-init.js`) as same-origin `<script src>` files with no inline scripts and no `eval()`. Helmet's default `script-src 'self'` policy passes. No CSP change needed.

---

### `API_BASE` constant duplicated in `ContentPage.tsx` and `HomePage.tsx`

**Where:** `apps/web/src/components/ContentPage.tsx:11`, `apps/web/src/components/HomePage.tsx:9`

`const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''` is copy-pasted in two components.

**Fix:** Extract to `apps/web/src/lib/api.ts` and import it. Two lines of extraction not worth the disruption before submission; do it when a third consumer appears.

---

### Shared API contract types are duplicated across the monorepo

**Where:** `apps/api/src/content/content.service.ts:8` (`ContentPage`), `apps/web/src/components/ContentPage.tsx:5` (`ContentPageData`)

The `{ slug, title, html }` shape is declared twice by hand — once in each app.

**Fix at scale:** A `packages/types` workspace with a single `ContentPage` type, imported by both apps. For two files, the duplication is acceptable; add the package when the contract grows or a third consumer appears.

---

## Additional findings (pre-deploy audit, 2026-06-30)

### `@Slug` decorator does not URL-decode path segments

**Where:** `apps/api/src/content/content.controller.ts:30`

`req.url.slice(prefix.length).split('?')[0].split('/').filter(Boolean)` extracts raw URL segments without calling `decodeURIComponent`. A URL like `/api/content/hello%20world` reaches `list()`/`read()` as `['hello%20world']`, while the filesystem path is `hello world` — they disagree. Only affects non-ASCII or space-containing folder names; all sample content is ASCII.

**Why deferred:** All sample content uses ASCII-safe slugs (kebab-case). Fix: `decodeURIComponent` each segment, then re-guard against decoded `..` and `/` characters before hitting the traversal check. Deferred to avoid re-testing the security boundary before submission.

---

### `list()` is an uncached tree walk; `loadTemplate()` is cached on first read

**Where:** `apps/api/src/content/source.ts` (`list()`), `apps/api/src/content/content.service.ts` (`loadTemplate()`)

Every call to `GET /api/pages` walks the `content/` directory tree from scratch. The template (rarely changed) is cached after the first read. This is the inverse of what you'd cache: page listings change only when marketing adds a folder; the template almost never changes.

**Why deferred:** At this content scale (handful of folders) the tree walk is negligible. The correct scale-up is a `ContentSource` implementation that watches the filesystem (`chokidar`) or caches with a TTL and invalidates on write — a natural next step when the content library grows.

---

### No rate limiting

**Where:** `apps/api/src/main.ts` (bootstrap)

The API has no request-rate protection. A script could hammer `/api/pages` or the content endpoints.

**Fix when needed:** `@nestjs/throttler` — add `ThrottlerModule.forRoot()` in `AppModule` and `@UseGuards(ThrottlerGuard)` on the controller (or globally). Deferred because this is a read-only, no-auth, no-mutation API behind Render's infrastructure; rate limiting adds a dependency and config surface with low payoff at MVP scope.

---

### Render free-tier cold starts

**Where:** `render.yaml` (`plan: free`)

Render's free tier spins down after ~15 minutes of inactivity. The first request after a cold start incurs a startup delay — measured at **~22.7s cold** (first hit after idle); subsequent warm requests are **0.3–0.7s**.

**Documented, not fixed:** Acceptable for a demo/assessment. Production fix: upgrade to a paid plan (always-on) or add a cron/uptime ping service (e.g. UptimeRobot, a GitHub Actions schedule) to keep the container warm. Note this honestly to any reviewer who clicks the live link cold.

---

### `content/` is baked into the Docker image at build time

**Where:** `apps/api/Dockerfile:45`

`COPY content/ ./content/` means adding a new marketing page requires a container rebuild and redeploy — the "drop a folder, no restart" claim holds only in local dev (where `content/` is a live directory on disk).

**Documented, not fixed:** The `ContentSource` interface exists precisely to make this swappable. The next step is a `CmsContentSource` or `S3ContentSource` that reads from an external store — the controller and service need zero changes. For this assessment scope, baking content into the image is simpler and more predictable than a mounted volume or external store.

---

### Search functionality — deliberately omitted

**Why not built:** The app currently has 5 content pages. A full-text search implementation (client-side Fuse.js, a search index endpoint, or an Algolia/Typesense integration) would be engineering infrastructure for a problem that doesn't exist at this scale. It reads as gold-plating.

**Design when it matters:** A `GET /api/search?q=...` endpoint in the API that does case-insensitive substring matching against `getPage()` results for a small corpus; or a dedicated search index (`ContentSource` variant that pre-indexes on startup) for larger content trees. The `ContentSource` abstraction means this slot in the module graph is already defined.

---

### RSS feed, reading time — "early" at 5 pages

**Where:** `apps/api/src/content/content.service.ts:getRssXml`, `render.ts:readingTime`

RSS feeds are meaningful when content is published regularly and readers want to subscribe. At 5 pages with no publication cadence, it's infrastructure ahead of the need. Reading time is useful on long articles; short marketing blurbs (~50 words) show "1 min read" which adds noise.

**Why built anyway:** (a) the blog section explicitly signals intent to grow; (b) RSS is a standard web citizen feature with near-zero implementation cost (hand-built XML, no dependency); (c) reading time adds zero runtime cost and creates the ground for future longer-form content. **Rationale:** we built the *capability* (front-matter parsing, the RSS endpoint) to match where the content is headed, not where it is today.

---

### Dark-mode toggle: no toggle before this sprint

**Where:** `apps/web/src/components/Layout.tsx`, `apps/web/src/index.css`

Dark mode was previously `prefers-color-scheme` only (no user toggle). Added a class-based toggle with `localStorage` persistence as part of the content-platform polish sprint (2026-07-01). **Rationale:** started with the system default, which is correct for an MVP; added the toggle when rounding out the content-platform feature set.

---

## Additional findings (design-system adoption, 2026-07-01)

### Webfonts load from Google Fonts at runtime

**Where:** `apps/web/src/design-system/tokens/fonts.css`

The editorial type trio (Newsreader, Public Sans, IBM Plex Mono) loads via a Google Fonts `@import`, an external network dependency and a render-blocking request on first paint.

**Why deferred:** Acceptable for a demo/assessment; the fonts have generous fallback stacks (`Georgia`, `system-ui`, `Menlo`) so the page is never unusably unstyled if the CDN is unreachable. **Fix for production:** self-host the `.woff2` binaries under `apps/web/public/fonts/` and replace the `@import` with local `@font-face` rules — the tokens file's own header comment already documents this as the intended next step.

---

### `apps/web/vercel.json` hardcodes the Render API URL for `/rss.xml` and `/sitemap.xml`

**Where:** `apps/web/vercel.json`

Content can embed relative links to API-only routes (e.g. `content/blog/index.md` links to `/rss.xml`) — on the split-host deployment those need to be proxied through the SPA's origin to the API's origin, or they 404. Vercel's `rewrites` are static JSON with no env-var interpolation, so the Render URL is hardcoded as the rewrite destination rather than read from `VITE_API_BASE_URL`.

**Why accepted:** Same tradeoff already made for the live URLs quoted in the README. If the API's Render URL ever changes, this file needs a one-line update alongside the README and Vercel's `VITE_API_BASE_URL` env var.
