# One-shot migration + seed runner, used as the `migrate` service in
# docker-compose.yml. Runs to completion, then exits (service_completed_successfully).
# Runs scripts/seed.js WITHOUT SEED_INCLUDE_TEST_DATA — this only ever
# applies production-safe seeds (roles/settings), never the dev-only owner
# account or sample data (see scripts/seed.js).
FROM node:20-alpine
WORKDIR /repo
RUN addgroup -g 1001 -S migrate && adduser -S migrate -u 1001
COPY package.json package-lock.json ./
RUN npm install --omit=dev --no-workspaces pg && chown -R migrate:migrate /repo
COPY --chown=migrate:migrate scripts/migrate.js scripts/migrate.js
COPY --chown=migrate:migrate scripts/seed.js scripts/seed.js
COPY --chown=migrate:migrate database/migrations database/migrations
COPY --chown=migrate:migrate database/seeds database/seeds
USER migrate
CMD ["sh", "-c", "node scripts/migrate.js up && node scripts/seed.js"]
