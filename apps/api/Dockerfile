# syntax=docker/dockerfile:1.7
FROM node:24-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d AS build

WORKDIR /app
COPY . .

RUN --mount=type=cache,id=aegis-pnpm-store,target=/pnpm/store \
  corepack enable \
  && pnpm config set store-dir /pnpm/store \
  && pnpm install --frozen-lockfile \
  && pnpm --filter @aegis/api build

FROM node:24-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d

ARG AEGIS_VERSION=dev
ARG SOURCE_REVISION=unknown
LABEL org.opencontainers.image.title="Aegis API" \
  org.opencontainers.image.description="Aegis self-hosted access governance API" \
  org.opencontainers.image.source="https://github.com/AstorisTheBrave/aegis" \
  org.opencontainers.image.version="${AEGIS_VERSION}" \
  org.opencontainers.image.revision="${SOURCE_REVISION}" \
  org.opencontainers.image.licenses="AGPL-3.0-or-later"

WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /app/packages/postgres-store/migrations ./packages/postgres-store/migrations

USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=12 CMD node -e "fetch('http://127.0.0.1:3000/ready').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "apps/api/dist/server.js"]
