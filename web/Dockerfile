# syntax=docker/dockerfile:1
#
# Targets:
#   dev     — next dev (hot reload); usar con docker-compose.dev.yml
#   runner  — NODE_ENV=production; next build + next start (deploy / tunnel)

FROM node:22-bookworm AS base
WORKDIR /app

# ─── Development ─────────────────────────────────────────────
FROM base AS dev
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY scripts ./scripts
RUN npm ci && npx prisma generate
COPY . .
RUN chmod +x scripts/docker-dev-entrypoint.sh scripts/docker-prod-entrypoint.sh || true
EXPOSE 3000
ENTRYPOINT ["sh", "scripts/docker-dev-entrypoint.sh"]
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]

# ─── Build (production assets) ────────────────────────────────
FROM base AS builder
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npx prisma generate && npm run build

# ─── Production runner ────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# deps runtime + prisma/tsx para entrypoint y worker
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY scripts ./scripts
COPY worker ./worker
# seed importa ../src/lib/...; worker también usa src/lib
COPY src ./src
COPY tsconfig.json ./
RUN npm ci \
  && npx prisma generate \
  && chmod +x scripts/docker-prod-entrypoint.sh scripts/docker-dev-entrypoint.sh

# Artefactos precompilados (sin bind-mount en runtime)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
ENTRYPOINT ["sh", "scripts/docker-prod-entrypoint.sh"]
CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
