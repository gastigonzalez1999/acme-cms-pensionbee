# ADR 0002: NestJS as the backend framework

**Status:** Accepted  
**Date:** 2026-06

## Context

Given a decoupled API approach (ADR 0001), we needed to choose a Node.js server framework.

## Decision

Use NestJS with the Express adapter.

## Why

1. **Team familiarity.** The project owner knows NestJS; the code will be maintained and extended by someone already fluent in its patterns.

2. **Dependency injection for the ContentSource abstraction.** The `ContentSource` interface (filesystem today, CMS tomorrow) is a natural DI use case. NestJS's IoC container makes the swap trivial: change one line in `ContentModule`. In Fastify or Express, you'd wire this manually.

3. **Built-in cross-cutting concerns.** Exception filters, `@nestjs/config` with validation, `@nestjs/swagger` for free OpenAPI docs, `nestjs-pino` for structured logging — each one a first-class, documented extension point rather than middleware glue.

4. **Gradual complexity.** NestJS's module system gives a clear home for future features: auth, caching, multi-tenancy, event sourcing. The module boundary discipline applies even at MVP scale.

## Tradeoffs

- **Heavier than Fastify/Express for this MVP.** The brief is four content routes. A raw Express server would be ~100 lines. NestJS is justified by the "platform" framing, not this sprint's scope alone.
- **Cold-start latency on serverless.** NestJS bootstraps slower than a Hapi or Express function because of the DI container. This is why we chose Render (long-running container) over Vercel serverless functions for the API deploy.
- **Fastify adapter available.** If raw throughput ever becomes a concern, the same `AppModule` runs on the Fastify adapter with a one-line change in `main.ts`.

## Alternatives considered

- **Fastify standalone:** faster, lighter, great TypeScript support. Rejected because we'd lose NestJS's DI (needed for ContentSource) and have to wire it manually.
- **Express standalone:** simplest, most familiar in the Node ecosystem. Rejected for the same DI reason and the lack of opinionated structure for future growth.
