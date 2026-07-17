# Worker image for Railway / Render / Fly.io.
# Build context is the monorepo root: `docker build -f apps/worker/Dockerfile .`
FROM node:20-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /app

# Install dependencies for the whole workspace (needed for shared packages).
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY apps/worker/package.json apps/worker/
COPY packages/config/package.json packages/config/
COPY packages/core/package.json packages/core/
COPY packages/database/package.json packages/database/
COPY packages/integrations/package.json packages/integrations/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @tavakoli/database generate
RUN pnpm --filter @tavakoli/worker build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/apps/worker
EXPOSE 3001
# Prisma engine + generated client are present via node_modules from the build stage.
CMD ["node", "dist/index.js"]
