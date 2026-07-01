# ADR 0001: Decoupled API + SPA architecture

**Status:** Accepted  
**Date:** 2026-06

## Context

The brief requires a full-stack JavaScript application that serves pages at URLs matching content folder paths, with React on the frontend. A single-app framework (Next.js) would achieve this with less glue. We chose a decoupled approach instead.

## Decision

Build two separate services: a NestJS content API and a Vite + React SPA.

## Why

1. **The brief says "other websites".** The phrase "to fit in with Acme Co's *other* websites" implies a shared content platform, not a one-off site. A standalone API is consumable by any future frontend without duplicating the rendering logic.

2. **The content service is framework-agnostic.** Rendering markdown to HTML, path resolution, and the `ContentSource` abstraction have no web-framework dependency. They could run on Edge workers, serverless functions, or a different server framework without rewriting business logic.

3. **Independent scaling.** The API is cache-friendly (static content); the SPA is a CDN artifact. They can scale and deploy independently.

4. **Clean test boundaries.** The API's integration tests verify HTTP contracts; the SPA's component tests verify rendering. Neither test tier bleeds into the other.

## Tradeoffs

- **More glue than a Next.js app.** A single Next.js app would need zero cross-origin plumbing, no separate deploy, and less boilerplate. For *this* MVP scope, that would have been simpler.
- **CSR/SEO tension.** A client-rendered SPA means the initial HTML is an empty `<div id="root">` — bad for marketing SEO. **Resolution:** the API's `GET /pages/*` endpoint returns server-rendered full HTML (template + content), so crawlers and direct links work. The SPA is the styled, interactive presentation layer on top.

## Alternatives considered

- **Next.js App Router:** single project, SSR by default, Vercel zero-config. Rejected because the content logic would be tied to the Next.js runtime, making a future mobile app or another frontend harder to serve.
