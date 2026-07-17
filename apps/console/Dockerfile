# syntax=docker/dockerfile:1.7
FROM node:24-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d AS build

WORKDIR /app
COPY . .

ARG VITE_AEGIS_API_URL=/api
ENV VITE_AEGIS_API_URL=$VITE_AEGIS_API_URL

RUN --mount=type=cache,id=aegis-pnpm-store,target=/pnpm/store \
  corepack enable \
  && pnpm config set store-dir /pnpm/store \
  && pnpm install --frozen-lockfile \
  && pnpm --filter @aegis/console build

FROM node:24-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d

ARG AEGIS_VERSION=dev
ARG SOURCE_REVISION=unknown
LABEL org.opencontainers.image.title="Aegis Console" \
  org.opencontainers.image.description="Aegis self-hosted access governance console" \
  org.opencontainers.image.source="https://github.com/AstorisTheBrave/aegis" \
  org.opencontainers.image.version="${AEGIS_VERSION}" \
  org.opencontainers.image.revision="${SOURCE_REVISION}" \
  org.opencontainers.image.licenses="AGPL-3.0-or-later"

WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/apps/console/dist ./apps/console/dist
COPY --from=build --chown=node:node /app/apps/console/server.mjs ./apps/console/server.mjs

USER node
EXPOSE 4173
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=12 CMD node -e "fetch('http://127.0.0.1:4173/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "apps/console/server.mjs"]
