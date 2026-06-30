# Learnings and Gotchas

Things discovered during the build that are worth remembering.

## NestJS 11 + ts-jest: `module: nodenext` conflict

**What happened:** NestJS 11 scaffolds `tsconfig.json` with `"module": "nodenext"` and `"resolvePackageJsonExports": true`. When ts-jest overrides `module: "commonjs"` (as it should for Jest's CommonJS environment), TypeScript throws TS5098 because `resolvePackageJsonExports` only works with `nodenext`/`node16`/`bundler` module resolution.

**Fix:** Override all three options together in the ts-jest transform config:
```json
["ts-jest", {
  "tsconfig": {
    "module": "commonjs",
    "moduleResolution": "node",
    "resolvePackageJsonExports": false
  }
}]
```

## NestJS 11 named wildcards don't capture slashes

**What happened:** `@Get('api/content/*path')` with `@Param('path')` works for single-segment paths (`/api/content/about-page`) but returns 404 for multi-segment paths (`/api/content/blog/june/update`).

**Root cause:** NestJS 11's wildcard handling (path-to-regexp under the hood) doesn't guarantee cross-slash capture for named wildcards with the Express adapter.

**Fix:** Use a `@Slug(prefix)` param decorator that extracts the path from `req.url` directly:
```typescript
function Slug(prefix: string): ParameterDecorator {
  return createParamDecorator((_data, ctx) => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const raw = req.url.startsWith(prefix)
      ? req.url.slice(prefix.length).split('?')[0]
      : '';
    return raw.split('/').filter(Boolean);
  })();
}
```

This is reliable regardless of how the framework transforms wildcards, and avoids copy-pasting url-parsing into every handler.

## ConfigModule + process.env timing in e2e tests

**What happened:** Setting `process.env.CONTENT_DIR = tmpDir` before calling `Test.createTestingModule` didn't reliably propagate into `ConfigService.get('CONTENT_DIR')` inside providers.

**Root cause:** The `validate` function in `ConfigModule.forRoot({ validate })` processes env vars at module compile time, but the class-transformer/class-validator pipeline's interaction with the process.env snapshot isn't guaranteed to be fresh in a Jest test environment.

**Fix:** Instead of relying on env var timing, use `overrideProvider`:
```typescript
const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(CONTENT_SOURCE)
  .useValue(new FileSystemContentSource(tmpDir))
  .compile();
```

This is cleaner anyway — it tests the service and controller independently of the provider factory.

## `import * as request from 'supertest'` breaks with `module: nodenext`

**What happened:** Namespace imports (`import * as X from 'module'`) for CJS packages return a namespace object when `module: nodenext` is in effect, not the callable export.

**Fix:** Use default import: `import request from 'supertest'` (works with `esModuleInterop: true`).

## Docker build context must be the repo root

**What happened:** The Dockerfile is at `apps/api/Dockerfile`, but it needs to `COPY content/` and `template.html` which live at the repo root. Docker `COPY` can't access paths outside its build context.

**Fix:** Build from the repo root: `docker build -f apps/api/Dockerfile .`
This is reflected in `render.yaml` (`dockerContext: .`).

## npm workspaces + Docker: use the root lockfile

**What happened:** In an npm workspaces monorepo, the only `package-lock.json` is at the workspace root. `apps/api/` has no standalone lockfile. A Dockerfile that does `COPY apps/api/package*.json ./` followed by `npm ci` hard-fails with:
```
The npm ci command can only install with an existing package-lock.json
```

**Fix:** Copy the workspace root manifests into the Docker build context:
```dockerfile
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
RUN npm ci --workspace=apps/api --include-workspace-root
```

Same pattern needed in CI (`cache-dependency-path: package-lock.json`, not `apps/api/package-lock.json`).

## Vite `defineConfig` vs `vitest/config`

**What happened:** Adding a `test` field to `vite.config.ts` causes a TypeScript error because `vite`'s `defineConfig` type doesn't include Vitest's test options.

**Fix:** Import `defineConfig` from `vitest/config` instead of `vite`. Vitest's `defineConfig` re-exports Vite's and adds the `test` options.

## Title extraction must use the parsed token tree, not a regex

**What happened:** `markdown.match(/^#\s+(.+)$/m)` for H1 title extraction has three failure modes:
1. `# Hello **world**` → title gets literal `**world**` (raw markdown syntax)
2. `Title\n=====` (setext heading) → regex misses it entirely → wrong fallback
3. A `# heading` line inside a fenced code block → incorrectly captured as the title

**Fix:** Parse the markdown-it token stream for the first `heading_open` with `tag === 'h1'`, then collect the `text` and `code_inline` children of the following `inline` token. This gives clean text without markdown syntax, handles setext headings, and ignores code blocks.

## `String.replace` with `$&` in content corrupts the output

**What happened:** `template.replace('{{content}}', html)` → if `html` contains `$&` (e.g. in text like "costs $&10"), JavaScript's `String.prototype.replace` interprets `$&` as "the matched substring" and inserts `{{content}}` inline, corrupting the result.

**What triggered it:** Any page with prose containing `$&`, `$1`–`$9`, or `$$`.

**Fix:** Use a replacement function:
```typescript
template.replace('{{content}}', () => html)
```

The function form is never interpreted for special patterns — it always returns the raw string.

## sanitize-html allowedTags defaults already include h1–h6

**What happened:** The initial sanitizer config added `...sanitizeHtml.defaults.allowedTags, 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'` — the heading tags are already in the defaults, so the spread was dead code adding nothing.

**Side effect discovered:** The default allowlist also strips `<img>` tags. For a marketing CMS where staff embed images in markdown, this silently removes them.

**Fix:** Remove the dead heading spread; explicitly add `img` with `allowedSchemesByTag: { img: ['http', 'https'] }` to allow images while blocking `data:` URIs.
