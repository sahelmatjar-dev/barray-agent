# One-shot migration + seed runner, used as the `migrate` service in
# docker-compose.yml. Runs to completion, then exits (service_completed_successfully).
# Runs scripts/seed.js WITHOUT SEED_INCLUDE_TEST_DATA — this only ever
# applies production-safe seeds (roles/settings), never the dev-only owner
# account or sample data (see scripts/seed.js).
FROM node:22-alpine
WORKDIR /repo
RUN addgroup -g 1001 -S migrate && adduser -S migrate -u 1001
# docker/migrate/package.json + package-lock.json is a standalone manifest
# (not the monorepo root's) declaring only what scripts/migrate.js and
# scripts/seed.js actually require: pg + Node built-ins. Previously this
# stage copied the root package.json/package-lock.json and ran
# `npm install --omit=dev --no-workspaces pg`, which silently installed
# nothing at all (`pg` is only a *devDependency* of the root manifest, so
# --omit=dev excluded it even though it was also passed as an explicit
# install target) — the image built successfully but failed at container
# runtime with "Cannot find module 'pg'". `npm ci` against this dedicated
# lockfile is deterministic and was verified to actually produce
# node_modules/pg.
COPY docker/migrate/package.json docker/migrate/package-lock.json ./
RUN npm ci --omit=dev && chown -R migrate:migrate /repo
COPY --chown=migrate:migrate scripts/migrate.js scripts/migrate.js
COPY --chown=migrate:migrate scripts/seed.js scripts/seed.js
COPY --chown=migrate:migrate database/migrations database/migrations
COPY --chown=migrate:migrate database/seeds database/seeds
USER migrate
CMD ["sh", "-c", "node scripts/migrate.js up && node scripts/seed.js"]
