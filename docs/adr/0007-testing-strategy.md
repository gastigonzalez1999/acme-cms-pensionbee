# ADR 0007: Testing strategy

**Status:** Accepted  
**Date:** 2025

## Context

The brief requires at minimum three tests. It also says tests must not depend on the existing sample content folders. We need a strategy that satisfies the brief, is maintainable, and gives genuine confidence in the system.

## Decision

Three-tier testing pyramid:

1. **Unit tests (Jest + NestJS testing module)** — pure functions and services in isolation.
2. **Integration tests (Jest + Supertest)** — real HTTP requests against a real NestJS app backed by a temporary fixture directory.
3. **Frontend tests (Vitest + React Testing Library + MSW)** — component rendering with a mocked API.

## Brief requirements → test locations

| Requirement | Test | Location |
|---|---|---|
| Valid URL → 200 | `GET /pages/test-page → 200` | `test/content.e2e-spec.ts` |
| Body contains rendered HTML | `body contains <h1>Test Page Title</h1>` | `test/content.e2e-spec.ts` |
| Unknown URL → 404 | `GET /pages/non-existent → 404` | `test/content.e2e-spec.ts` |

All three use a **temporary fixture directory** created in `beforeAll`, not the actual `content/` sample folders. This means the tests pass regardless of what content the marketing team adds or removes.

## Content isolation mechanism

```typescript
// e2e test setup
tmpDir = fs.mkdtempSync(...);  // fresh temp dir, not content/
fs.writeFileSync(path.join(tmpDir, 'test-page/index.md'), '# Test...');

const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(CONTENT_SOURCE)
  .useValue(new FileSystemContentSource(tmpDir))  // points at fixtures
  .compile();
```

The `CONTENT_SOURCE` DI token (ADR 0005) is what makes this clean: we swap the source, not the whole module.

## What we test beyond the brief

- Nested paths (`/api/content/nested/section`)
- Content-type headers (JSON vs HTML)
- Page listing (`GET /api/pages` → dynamic discovery)
- Health endpoint (`GET /healthz`)
- Path traversal rejection (`..%2F..%2Fetc%2Fpasswd` → 404)
- Template substitution (`{{content}}` is replaced, not present in output)
- React component render states (loading, success, 404, network error)
- Breadcrumb navigation for nested slugs

## What we intentionally don't test (and why)

- **E2E (Playwright):** planned for after the live deploy exists, as it needs real service URLs.
- **markdown-it internals:** we trust the library; we test that our `renderMarkdown` function calls it correctly and sanitizes the output.
