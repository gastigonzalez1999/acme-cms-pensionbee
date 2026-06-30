# Known Limitations & Deferred Findings

Findings from the pre-submission code review that were deliberately deferred.  
Not bugs blocking correctness — conscious tradeoffs, documented for the interview and for future iterations.

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

### Breadcrumb UX: raw slug segments and intermediate crumbs are 404

**Where:** `apps/web/src/components/ContentPage.tsx`

- Breadcrumb renders raw slug segments (e.g. `company-update`) while the homepage prettifies with `replace(/-/g, ' ')` — inconsistent UX.
- Intermediate crumbs (e.g. `/blog`, `/blog/june` for a page at `/blog/june/company-update`) link to paths that have no `index.md` → clicking them yields a 404.

**Why deferred:**  
Breadcrumb prettification is cosmetic. The intermediate-crumb 404 is a real UX issue but doesn't affect the brief's requirements. Fix: either disable linking on intermediate crumbs (render as plain text) or check `GET /api/pages` to know which intermediate paths are real pages.

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

### Helmet's default CSP may block Swagger at `/docs` in production

**Where:** `apps/api/src/main.ts`

`helmet()` sets a strict `Content-Security-Policy` by default. Swagger UI loads scripts and styles inline, which may be blocked by the default CSP in the Render deployment.

**Fix when it surfaces:** Configure `helmet({ contentSecurityPolicy: false })` (development-style) or add Swagger-specific CSP directives. Verify during the `/qa-sweep` pass.

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
