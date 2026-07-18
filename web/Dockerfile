# syntax=docker/dockerfile:1

FROM node:22-bookworm AS base
WORKDIR /app

FROM base AS dev
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY scripts ./scripts
RUN npm ci && npx prisma generate
COPY . .
RUN chmod +x scripts/docker-dev-entrypoint.sh || true
EXPOSE 3000
# Compose overrides with entrypoint; default for bare run:
ENTRYPOINT ["sh", "scripts/docker-dev-entrypoint.sh"]
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]

FROM base AS builder
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
USER nextjs
EXPOSE 3000
CMD ["npm", "run", "start"]
