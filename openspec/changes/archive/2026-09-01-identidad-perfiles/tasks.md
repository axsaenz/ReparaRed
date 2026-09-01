# Tasks: Identity and Profile Persistence

## Review Workload Forecast

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

- Estimated authored changes: 380–450 lines: migration ~140, schema ~80, two static specs ~150–200, plus records. Apply uses the single-unit/no-remote resolution and one exact commit; report the full range without compression.
- Delivery strategy: `ask-on-risk`; generated Prisma output and lockfile bulk are not authored scope.

Threat-matrix propagation: secrets/personal-data is applicable; run the static-secret RED gate before staging. Commit-state is apply-owned; run its RED gate immediately before commit.

## Phase 1: Schema

- [x] 1.1 Extend `apps/api/prisma/schema.prisma` with the exact model block from `openspec/changes/identidad-perfiles/design.md` (read-only): `UserRole`, `User`, `ClientProfile`, `TechnicianProfile`, `TechnicianSpecialty`, `Category`, and `District`, preserving every map, relation, unique, and bound.
- [x] 1.2 With a temporary invocation-only `DIRECT_URL`, run Prisma `validate` and `generate`; both must succeed, and generated output must remain unstaged and uncommitted.

## Phase 2: Migration

- [x] 2.1 Create `apps/api/prisma/migrations/20260901000000_identity_profiles/migration.sql` exactly from the design SQL (read-only): enum, six tables, named checks, email uniqueness, category-first reverse specialty index, FKs with `ON DELETE RESTRICT ON UPDATE CASCADE`, three trigger functions, three triggers, and zero `INSERT`s.
- [x] 2.2 Verify `apps/api/prisma/migrations/migration_lock.toml` (read-only) and migration #1 (read-only) are untouched; retain PostgreSQL locking and the empty baseline.

## Phase 3: Static Contract Tests

- [x] 3.1 Create `apps/api/src/database/identity-schema.spec.ts` with STATIC assertions for models, enum members, snake_case maps, relations, uniques, bounds, optional profile rows, and no password/secret credential columns; run optional DMMF checks when available.
- [x] 3.2 Create `apps/api/src/database/identity-migration.spec.ts` with STATIC assertions for exact named checks/predicates, functions/triggers, `ON DELETE RESTRICT`, named keys/indexes, and no `INSERT INTO`; run workspace `npm test` green.

## Phase 4: Verification Gates

- [x] 4.1 With temporary invocation-only `DIRECT_URL`, review `prisma migrate diff --from-empty --to-schema-datamodel` against the migration’s declarative portion; record Prisma-shape differences as review notes and treat hand-written SQL as authoritative.
- [x] 4.2 Run `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, and `npm run build`.
- [x] 4.3 Before staging, run static-secret RED: schema text has no password/secret columns and change files contain no credential or URL literals.
- [x] 4.4 Run commit-state RED for complete index contents and no generated output; create exactly `chore: add identity and profile persistence`, never `commit -a` or push, then require a clean tree.

## Phase 5: Records (Non-code)

- [x] 5.1 Create `openspec/changes/identidad-perfiles/apply-progress.md` with delivery/work-unit evidence and STATIC labels; record item #4 live apply→re-apply→status as UNSATISFIED, note that hand-written checks/triggers are executable only by live PostgreSQL, and state that item #6 MUST follow migration #2.
