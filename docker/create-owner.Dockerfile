# One-shot, interactive OWNER-account creation tool. Never started by
# `docker compose up` (see the `create-owner` service's `profiles: ["tools"]`
# in docker-compose.yml) — run explicitly with:
#   docker compose run --rm create-owner
#
# Deliberately a separate, minimal image rather than reusing the dashboard
# runtime image: the dashboard image is Next.js's pruned "standalone" build
# output (see docker/dashboard.Dockerfile) and never contains scripts/ or a
# full node_modules scripts/create-owner.js could run against. This mirrors
# docker/migrate.Dockerfile's pattern (see docker/migrate/package.json).
FROM node:22-alpine
WORKDIR /repo
RUN addgroup -g 1001 -S create-owner && adduser -S create-owner -u 1001
COPY docker/create-owner/package.json docker/create-owner/package-lock.json ./
RUN npm ci --omit=dev && chown -R create-owner:create-owner /repo
COPY --chown=create-owner:create-owner scripts/create-owner.js scripts/create-owner.js
USER create-owner
CMD ["node", "scripts/create-owner.js"]
