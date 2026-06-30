# ADR 0003: markdown-it + sanitize-html for rendering

**Status:** Accepted  
**Date:** 2025

## Context

The application must convert markdown files to HTML. The source is user-supplied content (marketing staff), not developer-controlled input.

## Decision

Use `markdown-it` for CommonMark-compliant markdown-to-HTML conversion, followed by `sanitize-html` for XSS sanitization.

## Why

**markdown-it:**
- Strict CommonMark compliance — predictable output for any valid markdown.
- Configurable: `html: false` prevents raw HTML pass-through in markdown source.
- Plugin ecosystem: `linkify`, `typographer` are one-flag options; future extensions (syntax highlighting, footnotes) integrate cleanly.
- Actively maintained, used by many large projects (GitLab, etc.).

**sanitize-html on top:**
- Defence-in-depth. Even with `html: false` in markdown-it, we sanitize the rendered output. If a future markdown-it version or plugin introduces a vector, sanitize-html is the second line.
- Whitelist-based: only explicitly allowed tags and attributes survive.
- Non-negotiable for user-supplied content, even from trusted internal authors.

## Tradeoffs

- **Two libraries instead of one.** `marked` with its built-in sanitization option was simpler. Rejected because `marked`'s sanitize option was deprecated in v7 and it recommends using `DOMPurify` or `sanitize-html` anyway.
- **`remark` + `rehype` ecosystem:** more powerful, extensible pipeline. Heavier for an MVP that only needs basic CommonMark. Noted as the upgrade path if the content authoring needs grow (e.g. custom directives, MDX).

## Security note

The rendered HTML is served from the API (`/api/content/*`) and injected into the SPA via `dangerouslySetInnerHTML`. This is safe only because the sanitization happens server-side before the response leaves the API. The SPA never receives unsanitized HTML.
