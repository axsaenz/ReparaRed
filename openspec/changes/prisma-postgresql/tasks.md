# Tasks: Prisma + PostgreSQL

## Review Workload Forecast

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

- Estimated authored changes: 360–395 lines across about 19 small source, test, SQL, and documentation files. Count additions plus deletions; exclude generated lockfile bulk from authored risk, but review the lockfile and generated-client status.
- Delivery strategy: `ask-on-risk`. Retain test, CLI, quality, staged-manifest, and clean-tree receipts for this single work unit.

## Phase 1: Prisma foundation

- [x] 1.1 Update `apps/api/package.json` with `@prisma/client: 6.19.3`, `prisma: 6.19.3`, `prisma:generate`, `prisma:migrate:deploy`, `prisma:migrate:status`, and `prebuild`; update `apps/api/.env.example` with names only, distinguishing runtime `DATABASE_URL` from CLI-only `DIRECT_URL`.
- [x] 1.2 Run root `npm install`; verify the matching dependency resolution in `package-lock.json` without committing generated client output.
- [x] 1.3 Create `apps/api/prisma/schema.prisma` with PostgreSQL, `env("DIRECT_URL")`, `prisma-client-js`, and zero models; create comment-only `apps/api/prisma/migrations/00000000000000_baseline/migration.sql` and PostgreSQL `apps/api/prisma/migrations/migration_lock.toml`.
- [x] 1.4 Verify or adjust `.gitignore` so generated Prisma output remains outside Git and lint scope.

## Phase 2: Configuration and client seam

- [x] 2.1 Extend `apps/api/src/config/env.schema.ts` with optional `DATABASE_URL`, URI validation restricted to `postgres`/`postgresql`, and key-only validation errors.
- [x] 2.2 Add the database URL getter to `apps/api/src/config/app-config.service.ts`; keep the URL out of logs and problem responses.
- [x] 2.3 Create `apps/api/src/database/prisma.service.ts` as one lazy singleton with configured `datasourceUrl`, no constructor/module-init connection, and guarded shutdown.
- [x] 2.4 Create `apps/api/src/database/database.module.ts` and wire it through `apps/api/src/app.module.ts` without bootstrap network I/O.

## Phase 3: Health

- [x] 3.1 Create `apps/api/src/database/prisma-health.indicator.ts` with conditional configuration and a bounded 2000ms `SELECT 1` race that fails safely.
- [x] 3.2 Wire `apps/api/src/health/health.module.ts` and `apps/api/src/health/health.controller.ts` at reserved extension point #4; leave liveness dependency-free and unchanged.

## Phase 4: Tests

- [x] 4.1 Extend `apps/api/src/config/env.schema.spec.ts` for valid, invalid, absent, and redacted URL cases.
- [x] 4.2 Add `apps/api/src/database/prisma.service.spec.ts` and `apps/api/src/database/prisma-health.indicator.spec.ts` for lazy construction, no-network spies, and stubbed down-path behavior.
- [x] 4.3 Update `apps/api/src/health/health.controller.spec.ts` and `apps/api/src/app.integration.spec.ts` for `inject()` no-URL 200 and configured-unreachable 503 without network; assert `npm` scripts contain no URL literals.
- [x] 4.4 Run `npm test` and require the workspace suite to pass.

## Phase 5: RED gates, offline evidence, quality, and commit

- [x] 5.1 Run the **secrets RED gate** before staging: invalid URL failures, logs, problems, and `apps/api/.env.example` (read-only) expose only `DATABASE_URL`/`DIRECT_URL` names, never values.
- [x] 5.2 Run the **shell RED gate** before staging: inspect `apps/api/package.json` (read-only) for credential/URL literals and verify CLI failures remain nonzero.
- [x] 5.3 With a temporary dummy `DIRECT_URL` only at invocation (never committed), run `npm exec --workspace=@repara/api -- prisma validate` (exit 0), `npm exec --workspace=@repara/api -- prisma migrate diff --from-empty --to-schema-datamodel apps/api/prisma/schema.prisma` (no SQL), and `npm run prisma:generate --workspace=@repara/api`; verify `git status` is clean after generate for generated output and that it is outside lint scope.
- [x] 5.4 Run `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, and `npm run build`.
- [x] 5.5 Run the **commit-state RED gate**: reject empty/wrong staging, verify the complete scoped manifest, and never use `commit -a`.
- [x] 5.6 Stage only intended files, create exactly `chore: add Prisma PostgreSQL foundation`, verify a clean tree, and never push.

## Phase 6: Pending live gate (non-code)

- [x] 6.1 Update `openspec/changes/prisma-postgresql/apply-progress.md` with the explicit unsatisfied `apply → re-apply → status` gate on disposable PostgreSQL and its closing conditions; do not claim live verification anywhere.
