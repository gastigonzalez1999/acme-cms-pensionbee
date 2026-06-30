---
name: qa-sweep
description: Full QA sweep for the Acme CMS project. Runs all automated tests, probes the live API for edge cases and bugs, and drives the SPA via Chrome DevTools MCP (browser-use skill). Trigger with /qa-sweep or when you want a comprehensive quality check before deploying or submitting.
---

# QA Sweep — Acme CMS

Run this skill for a structured quality pass before deployment or submission. It combines three tiers:

1. **Automated tests** — run and verify all suites pass
2. **Live API probe** — hit the running API directly to check expected responses, edge cases, and known-tricky paths
3. **Browser QA** — drive the SPA in a real browser via Chrome DevTools MCP (using the global `browser-use` skill)

---

## Step 1: Run all automated tests

```bash
# Unit + integration (NestJS / Jest)
cd apps/api && npm test && npm run test:e2e

# Web component tests (Vitest)
cd apps/web && npm test

# Typecheck both apps
npm run typecheck --workspaces
```

Report: number of test suites / tests / failures. Stop and surface failures — don't proceed to Step 2 until tests are green.

---

## Step 2: Start the API (if not running)

The probe phase requires a live server. If `python dev.py` is already running, skip this. Otherwise:

```bash
python dev.py   # starts API on :3000 and web on :5173
```

Alternatively, start just the API: `cd apps/api && npm run start:dev`

---

## Step 3: Live API probe

For each probe below, make the HTTP request, state the expected outcome, and report whether it matched. Flag any mismatches.

### Content serving — happy path
| Request | Expected | Check |
|---|---|---|
| `GET /pages/about-page` | 200, `text/html`, contains `<h1>` | ✓ / ✗ |
| `GET /pages/about-page` | `<title>` = page H1 text (not "Welcome to Acme") | ✓ / ✗ |
| `GET /api/content/about-page` | 200, JSON with `slug`, `title`, `html` keys | ✓ / ✗ |
| `GET /api/content/blog/june/company-update` | 200, slug = "blog/june/company-update" | ✓ / ✗ |
| `GET /api/pages` | 200, array includes "about-page", "blog/june/company-update" | ✓ / ✗ |
| `GET /healthz` | 200 | ✓ / ✗ |

### Content serving — 404 paths
| Request | Expected |
|---|---|
| `GET /pages/does-not-exist` | 404 |
| `GET /api/content/does-not-exist` | 404 |

### Security / edge cases
| Request | Expected | Why |
|---|---|---|
| `GET /api/content/..%2F..%2Fetc%2Fpasswd` | 404 (not 500, not file contents) | URL-encoded traversal |
| `GET /api/content/` (empty slug) | 404 | Empty segments |
| `GET /api/content/about-page?foo=bar` | 200 (query string stripped) | Query string handling |
| Add a new folder `content/qa-test-TIMESTAMP/index.md` with `# QA Test`, wait 1s, `GET /pages/qa-test-TIMESTAMP` | 200 | No-code-change requirement |

### HTML correctness
- Pick any page. Verify `<title>` text matches the H1 text exactly (no raw markdown syntax like `**bold**`).
- Verify markdown images in content (if present) render as `<img>` tags with `src` starting with `http`/`https`.
- Verify external links with `target="_blank"` have `rel="noopener noreferrer"`.

### API error format
- `GET /api/content/nonexistent` → JSON body must have shape `{ statusCode: 404, message: "...", path: "...", timestamp: "..." }`
- Verify no stack trace in the response body.

---

## Step 4: Browser QA via Chrome DevTools MCP

Use the `browser-use` skill (Chrome DevTools MCP) to drive the live SPA at `http://localhost:5173`.

```
/browser-use
```

**Script to follow:**

1. Navigate to `http://localhost:5173/`
   - Verify: home page renders, shows a list of content page links, no console errors.

2. Click the "about-page" link (or navigate to `/about-page`)
   - Verify: page renders styled content with an `<h1>`, breadcrumb shows "Home / about-page", no console errors, `document.title` = H1 text.

3. Navigate to `/blog/june/company-update`
   - Verify: nested path renders, breadcrumb shows "Home / blog / june / company-update".

4. Navigate to `/this-does-not-exist`
   - Verify: 404 component renders with "not found" message, no crash.

5. Take a screenshot. Describe any visual issues (spacing, overflow, broken layout).

6. Check browser console for: errors, failed network requests, CSP violations.

---

## Step 5: Summarise findings

Produce a short report:

```
## QA Sweep Summary — <date>

### Tests
- [ ] All unit/integration/e2e tests pass (N suites, N tests)

### API probe
- [ ] All happy-path responses correct
- [ ] All 404 paths return 404 (not 500)
- [ ] Security edge cases pass
- [ ] No-code-change page add works

### Browser QA
- [ ] Home page lists pages correctly
- [ ] Content page renders styled H1 + breadcrumb
- [ ] Nested page works
- [ ] 404 page renders correctly
- [ ] No console errors

### Issues found
<list any mismatches, bugs, or visual problems — file GitHub issues via /qa if needed>
```

If the repo is connected to GitHub, use the global `qa` skill to file any bugs as issues before proceeding to deployment.
