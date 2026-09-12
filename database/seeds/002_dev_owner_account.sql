-- 002_dev_owner_account.sql
-- =====================  DEV/TEST ONLY — NOT FOR PRODUCTION  =====================
-- Creates a default OWNER login for local development and the test suite.
-- The password hash below is PUBLIC (it's in this git repository) — it
-- corresponds to the plaintext "ChangeMe123!". Anyone who reads this file
-- can log in as OWNER if this account exists on a reachable instance.
--
-- scripts/seed.js SKIPS this file by default. It is only applied when the
-- caller explicitly opts in with SEED_INCLUDE_TEST_DATA=true (which
-- `npm run db:seed` does, for local development and CI). The Docker Compose
-- `migrate` service does NOT set that variable, so a `docker compose up`
-- deployment never gets this account — see README "How to create the first
-- user" for the production-safe alternative (scripts/create-owner.js).
INSERT INTO users (email, full_name, password_hash, locale, status)
VALUES ('owner@elbarrayra.test', 'EL BARRAY RA Owner (DEV)', '$2a$10$mowNIM/kwR3BGqfv9ykLzOlKPqnKOk239a/lHzsFcbPxSaNQelhxa', 'ar', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'owner@elbarrayra.test' AND r.code = 'OWNER'
ON CONFLICT DO NOTHING;
