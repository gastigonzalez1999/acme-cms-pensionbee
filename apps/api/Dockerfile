# Build context: repo root (docker build -f apps/api/Dockerfile .)
#
# Why build from the root: the NestJS API needs the content/ folder and
# template.html which live at the repo root, not inside apps/api.
#
# Why the workspace lockfile: this is an npm workspaces monorepo. The only
# package-lock.json is at the repo root. apps/api has no standalone lockfile,
# so `npm ci` must run against the workspace root manifest + lockfile.
#
# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /build

# Copy workspace root manifests + lockfile so npm ci resolves the full dep tree.
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/

# Install the API workspace's dependencies using the root lockfile.
RUN npm ci --workspace=apps/api --include-workspace-root

# Copy source and compile.
COPY apps/api/ ./apps/api/
RUN npm run build --workspace=apps/api

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

# Non-root user for security.
RUN addgroup -S acme && adduser -S acme -G acme

WORKDIR /app

ENV NODE_ENV=production

# Production dependencies only — same workspace lockfile approach.
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
RUN npm ci --workspace=apps/api --include-workspace-root --omit=dev

# Compiled server code from the build stage.
COPY --from=builder /build/apps/api/dist ./dist

# Static content assets (read-only at runtime — we never write to them).
COPY --chown=acme:acme content/ ./content/
COPY --chown=acme:acme template.html ./template.html

USER acme

ENV CONTENT_DIR=/app/content
ENV TEMPLATE_PATH=/app/template.html
ENV PORT=3000

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/healthz || exit 1

CMD ["node", "dist/main"]
