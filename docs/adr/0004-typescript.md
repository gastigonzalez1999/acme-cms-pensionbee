# ADR 0004: TypeScript

**Status:** Accepted  
**Date:** 2026-06

## Context

The brief says "JavaScript application." TypeScript compiles to JavaScript and is widely understood to satisfy that constraint.

## Decision

Use TypeScript for both the API and the web app. Run `tsc --noEmit` in CI to gate both builds.

## Why

1. **Self-documenting contracts.** The `ContentSource` interface, `ContentPage` shape, and `RenderedPage` type serve as living documentation of the data model. A future developer (or AI assistant) knows exactly what `ContentService.getPage()` returns without reading the implementation.

2. **Compile-time safety.** The NestJS ecosystem is TypeScript-first; using JS would lose decorator metadata, type-checked injection tokens, and IDE auto-complete for NestJS APIs.

3. **Production signal.** TypeScript is standard in all of Acme's existing websites ("to fit in with Acme Co's other websites"). Submitting a JS solution would be an odd choice.

## Tradeoffs

- **Build step.** TypeScript adds a compilation step. Both `tsc --noEmit` (type gate) and `nest build` / `vite build` (compilation) are included in CI. Zero runtime overhead — Node runs the compiled JS.
- **`nodenext` module resolution gotcha.** NestJS 11's default `tsconfig.json` uses `module: nodenext`, which conflicts with ts-jest. We override to `module: commonjs` in the jest transform config. See `CLAUDE.md` for the exact setting.
