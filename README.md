# SkillBery

Existing college LMS: Next.js/React frontend, Express/Mongoose API, MongoDB and Socket.IO. Start with [the audit](docs/skillbery-audit.md), [architecture and contracts](docs/architecture.md), [migration procedure](docs/migrations.md), and [production runbook](docs/production.md).

## Local development

Use a supported Node version compatible with Next 16 and Mongoose 9 (Node 22.12+); this audit ran on Node 26.11.1. Install from each lockfile with `npm ci`. Copy each `.env.example` to the application's local environment file and replace placeholders. MongoDB must be a replica set, including local development; enrollment, promotion and scoring use transactions. Preserve the existing database name.

From `backend`: `npm run dev`. From `frontend`: `npm run dev`. The default UI is http://localhost:3000 and API is http://localhost:5000/api. Students can register through a shared QR and join directly; invitations with an explicit email roster require administrative identity approval. Create classrooms from Create Class after setting up batches and faculty allocations. Faculty accounts are administrator-created. Use the seed command below for the first administrator.

## First administrator

From `backend`, run `npm run seed:admin`. It uses MongoDB/DNS settings in `backend/.env`, creates `admin@skillbery.local`, and prints a generated password once. Sign in at `/admin/login`. Customize with `npm run seed:admin -- --email admin@yourcollege.edu --name "College Admin"`. Optionally supply `SEED_ADMIN_PASSWORD` in the process environment (12+ characters, at most 72 UTF-8 bytes); do not commit it. Re-running preserves existing accounts/passwords and never promotes a student account.

## Verification

From `backend`, `npm test` starts its own disposable MongoDB replica set. Its first run downloads MongoDB 8.2.6; no configured application database is used. `npm run test:browser` starts a synthetic API on 5507 and Next dev on 3107 and uses installed Chrome (set `PLAYWRIGHT_EXECUTABLE_PATH` for another Chromium binary). It does not exercise real Cloudinary storage. Stop existing processes on those dedicated test ports first.

From `frontend`: `npm run lint`, `npm run build`. Load tests: from `backend`, `npm run load -- 200` or `npm run load -- 400`. See [measurement details](docs/load-testing.md). Legacy backend root test/cleanup scripts are maintenance utilities; do not run them against real data as a test suite.

The inactive `frontend-vite-backup` is retained for historical reference and is not a deployment target. Coding execution and anonymous assessment participation are disabled. Production approval remains blocked by the items in the audit.
