# ADR 0005: ContentSource interface as a DI abstraction

**Status:** Accepted  
**Date:** 2025

## Context

The MVP reads content from the local filesystem. The marketing team is likely to outgrow file-based authoring and move to a headless CMS (Contentful, Sanity, etc.) or a database.

## Decision

Define a `ContentSource` interface with `read(segments)` and `list()` methods. Wire the current `FileSystemContentSource` implementation via a NestJS DI provider token. `ContentService` depends on the token, not the implementation.

## Why

This is an explicit, deliberate exception to the "no abstractions for single-use code" guideline. The justification:

1. **The seam costs almost nothing.** An interface + a token + one line in the module provider list. The ongoing maintenance cost is zero.

2. **The swap is a real near-term need.** Marketing staff adding folders is the MVP story. A CMS authoring experience is the obvious next sprint. Making that swap a two-line change (`useClass: ContentfulSource`) is worth the minimal upfront cost.

3. **It improves testing.** Unit tests for `ContentService` inject a mock source via the same token. E2E tests override `CONTENT_SOURCE` with a `FileSystemContentSource` pointing at a temp directory. No test touches the real `content/` folder.

## Tradeoffs

- **One extra abstraction at MVP scale.** Purists would say "start with the concrete class, extract the interface when you need it." Valid — but the interface only costs one file and a symbol declaration. The refactor to add it later would cost more.

## ContentSource implementations (upgrade path)

| Source | Implementation notes |
|---|---|
| Filesystem (current) | `FileSystemContentSource` — walks `content/` |
| Contentful CMS | `ContentfulContentSource` — uses Contentful Delivery API |
| Database (Prisma) | `PrismaContentSource` — queries a `pages` table |
| S3 | `S3ContentSource` — streams `.md` from an S3 bucket |

Any of these slots in with zero changes to `ContentService` or `ContentController`.
