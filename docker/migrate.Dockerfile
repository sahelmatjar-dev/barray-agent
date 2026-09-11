# One-shot migration + seed runner, used as the `migrate` service in
# docker-compose.yml. Runs to completion, then exits (service_completed_successfully).
FROM node:20-alpine
WORKDIR /repo
COPY package.json package-lock.json ./
RUN npm install --omit=dev --no-workspaces pg
COPY scripts/migrate.js scripts/migrate.js
COPY scripts/seed.js scripts/seed.js
COPY database/migrations database/migrations
COPY database/seeds database/seeds
CMD ["sh", "-c", "node scripts/migrate.js up && node scripts/seed.js"]
