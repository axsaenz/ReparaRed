# Tasks: Quote Persistence

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~250–320 authored |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR; three internal work units |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Schema and migration | Single PR | `npm --prefix apps/api exec prisma validate -- --schema prisma/schema.prisma` | N/A — live database gate is pending | Revert schema and migration directory |
| 2 | Static contracts | Single PR | `npm --prefix apps/api test -- src/database/quote-schema.spec.ts src/database/quote-migration.spec.ts` | N/A — assertions are offline by design | Revert four contract specs |
| 3 | Gates and records | Single PR | `npm test` | N/A — apply/concurrency proof requires disposable PostgreSQL | Revert the implementation commit |

## Phase 1: Schema

- [x] 1.1 Extend `apps/api/prisma/schema.prisma` with the exact normative block from `openspec/changes/cotizaciones/design.md` (read-only): `QuoteStatus`’s four members, `Quote`’s UUID/Decimal(8,2)/VarChar(3)/VarChar(1000)/TIMESTAMPTZ fields, defaults, mappings, named unique/indexes, restrictive FKs, and reverse `quotes` relations.
- [x] 1.2 With invocation-only temporary `DIRECT_URL`, run Prisma `validate` and `generate` against `apps/api/prisma/schema.prisma` (read-only); remove the value afterward and keep generated output untracked.

## Phase 2: Migration

- [x] 2.1 Create `apps/api/prisma/migrations/20260901000002_quotes/migration.sql` exactly per design: enum, table, named PK, exact amount/PEN/trimmed-description checks, pair unique, two directed indexes, two `RESTRICT` FKs with `CASCADE` updates, zero inserts, and no triggers.
- [x] 2.2 Confirm `apps/api/prisma/migrations/migration_lock.toml` (read-only) is untouched and migrations #1–#3 are not rewritten.

## Phase 3: Static Contracts

- [x] 3.1 RED: add fail-closed `STATIC` forbidden-literal assertions in `apps/api/src/database/quote-schema.spec.ts` and `apps/api/src/database/quote-migration.spec.ts` for URL and credential patterns.
- [x] 3.2 Complete the two new specs with `STATIC` assertions for model count 10, enum members `SUBMITTED`, `WITHDRAWN`, `SELECTED`, `CLOSED`, exact Prisma mappings/types/default/actions, indexes `idx_quotes_technician_created` and `idx_quotes_request_created`, exactly two `RESTRICT` FKs, and predicates `("amount" >= 0.01 AND "amount" <= 999999.99)`, `("currency" = 'PEN')`, and `char_length(trim("description")) BETWEEN 10 AND 1000`; reject `INSERT INTO`, `CREATE FUNCTION`, and `CREATE TRIGGER`.
- [x] 3.3 Change only 9→10 model-count assertions in `apps/api/src/database/identity-schema.spec.ts` and `apps/api/src/database/request-image-schema.spec.ts`; run workspace `npm test` green.

## Phase 4: Verification Gates

- [x] 4.1 Review `prisma migrate diff --from-empty` against `apps/api/prisma/migrations/` (read-only); record differences in `openspec/changes/cotizaciones/apply-progress.md` and treat hand-authored migration SQL as authoritative.
- [x] 4.2 RED literal/secrets scan before staging: verify `apps/api/prisma/schema.prisma` (read-only), `apps/api/prisma/migrations/20260901000002_quotes/migration.sql` (read-only), `apps/api/src/database/quote-schema.spec.ts` (read-only), and `apps/api/src/database/quote-migration.spec.ts` (read-only) contain no URL or credential patterns.
- [x] 4.3 Pass `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, and `npm run build`.
- [x] 4.4 RED commit-state gate: from clean status, explicitly stage only `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20260901000002_quotes/`, both new specs, both updated specs, and `openspec/changes/cotizaciones/`; reject generated files and `apps/api/prisma/migrations/migration_lock.toml` (read-only).
- [x] 4.5 After the Phase 5 record is present, create exactly one `chore: add quote persistence` commit, verify clean tree, never use `commit -a`, and never push.

## Phase 5: Records

- [x] 5.1 Create `openspec/changes/cotizaciones/apply-progress.md` with delivery/work-unit evidence, `STATIC` labels, and the final authored count; prepare it before Phase 4.4 staging.
- [x] 5.2 Record the carried-forward live gate as `UNSATISFIED / RECORDED PENDING`: migrations #1–#4 apply→re-apply→status and seed execution remain unsatisfied; note unique-index race/concurrency proof is live-only and quote transitions plus availability revalidation are API-owned under ADR-0015 in #23/#28/#31.
