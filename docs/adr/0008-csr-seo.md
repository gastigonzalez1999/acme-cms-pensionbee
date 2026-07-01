# ADR 0008: CSR/SEO tradeoff and resolution

**Status:** Accepted  
**Date:** 2026-06

## Context

The brief says "requests to /about-page would return an HTML page." It also requires React on the frontend. These two requirements create a tension: a client-rendered React SPA returns an empty `<div id="root">` in its initial HTTP response, not the rendered page content.

## Decision

The **API is the authoritative content contract**. The same content core serializes to two formats:

- `GET /api/content/*` → JSON `{ slug, title, html }` — consumed by the React SPA
- `GET /pages/*` → Full `text/html` (template.html + rendered markdown) — for crawlers, direct access, and the brief's HTTP tests

The React SPA (`/* → ContentPage`) fetches from `/api/content/*` and renders the HTML fragment into a styled layout. Crawlers and the brief's tests use `/pages/*` which returns server-rendered HTML without JavaScript required.

## Why this resolves the tension

The brief's three test requirements all use HTTP-level assertions (status codes, body content). These work cleanly against `/pages/*` because the response body contains the rendered HTML synchronously. The SPA is the interactive presentation layer on top — it does not need to satisfy the "body contains the HTML" test directly.

## SEO upgrade path (if marketing needs it)

| Approach | Effort | Notes |
|---|---|---|
| Current (`/pages/*` HTML) | 0 | Server-rendered, crawlable today |
| SPA with prerendering | Medium | `vite-plugin-ssr` or Astro as static generator |
| Next.js (SSR/ISR) | High | Replace the SPA; reuse the NestJS API as a data source |
| `@nestjs/serve-static` for pre-built SPA | Low | Serve the Vite build from the API; no cross-origin CORS |

The cleanest migration if SEO becomes a priority: keep the NestJS API as-is and replace the Vite SPA with a Next.js app that calls `GET /api/content/*` server-side (RSC or `getServerSideProps`). Zero API changes required.
