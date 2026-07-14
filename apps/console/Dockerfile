# syntax=docker/dockerfile:1.7
FROM node:24-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d

WORKDIR /app
COPY . .

ARG VITE_AEGIS_API_URL=/api
ENV VITE_AEGIS_API_URL=$VITE_AEGIS_API_URL

RUN --mount=type=cache,id=aegis-pnpm-store,target=/pnpm/store \
  corepack enable \
  && pnpm config set store-dir /pnpm/store \
  && pnpm install --frozen-lockfile \
  && pnpm --filter @aegis/console build

ENV NODE_ENV=production
EXPOSE 4173
CMD ["node", "apps/console/server.mjs"]
