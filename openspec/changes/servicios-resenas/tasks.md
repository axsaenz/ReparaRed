# Tasks: Persist Services and Reviews

## Review Workload Forecast

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

| Field | Value |
|---|---|
| Estimated authored lines | 340–430 (schema 60–75; migration 95–120; static specs 180–230; counts 6) |
| Delivery strategy | ask-on-risk |
| Suggested resolution | One cohesive local unit; no remote chain; use `size:exception` if final authored diff exceeds 400 |

### Suggested Work Units

| Unit | Goal | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| 1 | Complete schema, migration, contracts, gates | `npm test` | N/A: live PostgreSQL gate is carried forward pending | Revert the single commit and change artifacts |

Every checkbox is dependency-ordered and completable in one session.

## Phase 1: Schema

- [x] 1.1 Extend `apps/api/prisma/schema.prisma` with the exact normative block in `openspec/changes/servicios-resenas/design.md` (read-only): `ServiceStatus`; Quote composite target; Service fields, cancellation trio, relations, and directed index; Review fields, relations, and createdAt-only shape; reverse relations.
- [x] 1.2 Run `prisma validate` and `prisma generate` with temporary invocation-only `DIRECT_URL`; if the composite relation fails unexpectedly, STOP and report it—never silently take the fallback.

## Phase 2: Migration

- [x] 2.1 Create `apps/api/prisma/migrations/20260901000003_services_reviews/migration.sql` exactly per the normative design SQL: `CREATE TYPE`, quote unique target, named services/reviews tables, keys/uniques/checks, state predicate, request/composite/cancellation-actor FKs, directed index, `reviews_immutable`/`prevent_review_modification`, and zero INSERTs.
- [x] 2.2 Leave `apps/api/prisma/migration_lock.toml` (read-only) and migrations #1–#4 unchanged; verify the migration is additive and hand-authored.

## Phase 3: Static Contracts

- [x] 3.1 Create `apps/api/src/database/service-review-schema.spec.ts` and `apps/api/src/database/service-review-migration.spec.ts` with `STATIC` labels and exact assertions for 12 models, five enum members, mappings, named uniques/checks, composite FK, cancellation all-or-nothing/reason predicates, rating 1–5, `reviews_immutable`/`prevent_review_modification`, five `RESTRICT` FKs, createdAt-only Review, and no INSERTs.
- [x] 3.2 Update 10→12 model counts in `apps/api/src/database/identity-schema.spec.ts`, `apps/api/src/database/request-image-schema.spec.ts`, and `apps/api/src/database/quote-schema.spec.ts`; run workspace `npm test` green.

## Phase 4: Verification Gates

- [x] 4.1 Review the from-empty Prisma diff against `apps/api/prisma/migrations/` (read-only), record differences, and treat the hand-authored trigger plus composite quote target as authoritative.
- [x] 4.2 Run literal/secrets RED before staging; failure blocks apply. Run lint, format:check, typecheck, test, and build quality gates.
- [x] 4.3 Run commit-state RED before commit; explicitly stage schema, migration directory, two new specs, three updated specs, and change artifacts only—nothing generated. Never `commit -a` or push; create one commit exactly `chore: add service and review persistence`, then require a clean tree.

## Phase 5: Records

- [x] 5.1 Create `openspec/changes/servicios-resenas/apply-progress.md` with delivery/work-unit evidence, `STATIC` labels, final authored count, and carried-forward live gate: migrations #1–#5 apply→re-apply→status, seed execution, and trigger/concurrency behavior UNSATISFIED.
- [x] 5.2 Record enforcement split: service transitions/actors, cancellation authorization, and review eligibility are API-owned under ADR-0015 in #31/#34–#38; composite FK, uniques, and immutability trigger are DB final defenses.
