# syntax=docker/dockerfile:1

# Build context MUST be the repo root (not apps/backend) — @novaway/backend
# depends on the workspace package @novaway/shared-types, which needs its
# own `tsc` build to produce dist/index.d.ts before backend's build can
# resolve it. Same ordering requirement as .github/workflows/ci.yml.

FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@11.14.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @novaway/shared-types build
RUN pnpm --filter @novaway/backend build

FROM node:22-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
# Copying the whole build stage (not just dist/) keeps pnpm's symlinked
# node_modules structure intact. Trimming devDependencies for a smaller
# image is a later optimization, not required for a working staging image.
COPY --from=build /repo /repo
WORKDIR /repo/apps/backend

# Railway (and any other host) injects PORT at runtime; main.ts reads it via
# ConfigService with a 3000 fallback for local/non-hosted runs.
EXPOSE 3000
CMD ["node", "dist/main.js"]
