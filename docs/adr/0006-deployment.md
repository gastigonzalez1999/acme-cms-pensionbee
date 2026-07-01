# ADR 0006: Split-host deployment (Vercel SPA + Render API)

**Status:** Accepted  
**Date:** 2026-06

## Context

We have two artefacts: a static Vite SPA and a long-running NestJS server.

## Decision

Deploy the React SPA as a static site on **Vercel**; deploy the NestJS API as a Docker container on **Render**.

## Why

**Vercel for the SPA:**
- Zero-config for static sites.
- Global CDN — the SPA is cached at the edge worldwide.
- `vercel.json` rewrites handle React Router's client-side routing (`/* → /index.html`).
- Auto-deploys on every push to `main`.

**Render for the API:**
- Long-running container = no cold-start penalty (important for NestJS's DI bootstrap time).
- Persistent filesystem — content is baked into the Docker image at build time; the container reads it without any mounting or bundling tricks.
- `render.yaml` defines the service declaratively (infra-as-code).
- Free tier available; upgrade to always-on with one click.

**Why not Vercel serverless for the API too?**
We considered deploying both to Vercel (SPA + API as a Vercel serverless function). Rejected because:
1. NestJS's cold-start time (DI container initialization) is noticeable under the serverless model.
2. Serverless functions in Vercel have read-only filesystems — bundling `content/` as a static asset into a function has size limits and adds deploy complexity.
3. "One deploy for everything" is convenient, but "right tool for the job" wins at this scale.

## Tradeoffs

- **Two hosts to manage.** Two dashboards, two deploy pipelines, two places to update env vars. Acceptable for a service that grows independently from the frontend.
- **CORS required.** Cross-origin requests from the Vercel origin to the Render API need CORS headers. Configured via `CORS_ORIGIN` env var on the API. See `CLAUDE.md` for the deployment checklist.
- **Render free tier spins down.** Render's free web service sleeps after 15 minutes of inactivity and takes ~30s to wake. This is fine for an MVP demo; upgrade to a paid plan or configure an uptime ping service (e.g. UptimeRobot, cron job hitting `/healthz`) for production.
