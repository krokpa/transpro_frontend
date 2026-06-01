# ============================================================
# TransPro Frontend — Multi-stage Dockerfile (Next.js standalone)
# Build context : racine du monorepo
#   docker build -f apps/frontend/Dockerfile -t transpro-frontend .
# ============================================================

# ── Base ─────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@11 --activate

# ── Dépendances ───────────────────────────────────────────────
FROM base AS deps
WORKDIR /monorepo

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json    ./packages/shared/
COPY apps/frontend/package.json      ./apps/frontend/

RUN pnpm install --frozen-lockfile

# ── Build ────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /monorepo

COPY packages/shared/  ./packages/shared/
COPY apps/frontend/    ./apps/frontend/

# Build @transpro/shared (nécessaire pour les imports dans Next.js)
RUN pnpm --filter @transpro/shared build

# Variables d'env public Next.js (nécessaires au moment du build)
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ARG NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
ARG NEXT_PUBLIC_MAP_PROVIDER=leaflet
ARG NEXT_PUBLIC_MAPBOX_TOKEN=

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_MAP_PROVIDER=$NEXT_PUBLIC_MAP_PROVIDER
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN

RUN pnpm --filter @transpro/frontend build

# ── Runtime (image finale slim) ───────────────────────────────
FROM node:20-alpine AS runner

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js standalone : contient son propre server.js + node_modules minimum
COPY --from=builder --chown=nextjs:nodejs /monorepo/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /monorepo/apps/frontend/.next/static     ./apps/frontend/.next/static
COPY --from=builder --chown=nextjs:nodejs /monorepo/apps/frontend/public           ./apps/frontend/public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Le serveur standalone est dans apps/frontend/server.js
CMD ["node", "apps/frontend/server.js"]
