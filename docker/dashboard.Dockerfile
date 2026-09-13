# Multi-stage build for apps/dashboard (Next.js, standalone output).
# Build context must be the repository root (see docker-compose.yml).
#
# base/deps/build run on a glibc (Debian) image, not Alpine: package-lock.json
# was generated on a glibc host and only records the @next/swc-linux-x64-gnu
# native binding (no musl variant), and Next.js 16's Turbopack build requires
# a native swc binding — it cannot fall back to WASM. Building this stage on
# Alpine (musl) fails with "Turbopack is not supported on this platform...
# Only WebAssembly (WASM) bindings were loaded". The final `runner` stage
# below stays on node:22-alpine: it only runs the already-compiled standalone
# output (plain JS, no native runtime deps anywhere in this repo), so the
# smaller Alpine image is safe there.
FROM node:22-bookworm-slim AS base
WORKDIR /repo

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/ai/package.json packages/ai/package.json
COPY packages/integrations/package.json packages/integrations/package.json
RUN npm install

FROM base AS build
# Only the root node_modules is copied: this is a small npm workspaces repo
# with no version conflicts forcing npm to nest a package under
# apps/dashboard/node_modules, so that directory never exists after
# `npm install` at the repo root (verified: 0 packages in package-lock.json
# resolve under apps/dashboard/node_modules/). Node's module resolution
# walks up parent directories, so the hoisted root node_modules is found
# from apps/dashboard just as it is from the repo root.
COPY --from=deps /repo/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=apps/dashboard

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=build /repo/apps/dashboard/.next/standalone ./
COPY --from=build /repo/apps/dashboard/.next/static ./apps/dashboard/.next/static
COPY --from=build /repo/apps/dashboard/public ./apps/dashboard/public
USER nextjs
EXPOSE 3000
ENV PORT=3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/login || exit 1
CMD ["node", "apps/dashboard/server.js"]
