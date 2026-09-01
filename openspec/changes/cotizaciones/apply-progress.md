# Apply Progress: Quote Persistence

## Delivery Resolution

- Forecast: Medium risk, approximately 250–320 authored implementation lines.
- Resolution: SINGLE COMMIT, PROCEED; no chaining and no `size:exception`.
- Delivery boundary: quote schema, migration, static contracts, compatibility count updates, and verification records only.
- Rollback: revert the single implementation commit; no local database data exists to restore.

## Execution Mode

- Apply state at start: `ready`.
- Artifact store: OpenSpec file-based persistence.
- Testing mode: Standard mode (`strict_tdd: false`).
- Runtime harness: `STATIC` Vitest contracts and Prisma CLI checks; live database proof remains pending.

## Work Unit Evidence

| Work unit | Focused test command and exact result | Runtime harness command/scenario and exact result | Rollback boundary |
|---|---|---|---|
| Schema and migration | From `apps/api`, temporary invocation-only `DIRECT_URL`; `npm exec prisma validate -- --schema prisma/schema.prisma` and `npm exec prisma generate -- --schema prisma/schema.prisma`; both exited 0, schema valid, Prisma Client 6.19.3 generated. | `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` exited 0. Live apply is N/A without disposable PostgreSQL. | Revert `apps/api/prisma/schema.prisma` and `apps/api/prisma/migrations/20260901000002_quotes/`. |
| Static contracts | `npm test -- src/database/quote-schema.spec.ts src/database/quote-migration.spec.ts` from `apps/api`: 2 files passed, 10 tests passed. | Offline by design: both `STATIC` contract suites inspect schema and migration text; no database boundary is exercised. | Revert `apps/api/src/database/quote-schema.spec.ts` and `apps/api/src/database/quote-migration.spec.ts`. |
| Gates and records | Workspace `npm test`: 19 files passed, 114 tests passed; `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm run build` all exited 0. | Prisma diff was reviewed as the CLI harness; live migrations, re-apply/status, seed, and concurrency scenarios are recorded pending below. | Revert the single implementation commit. |

## RED Evidence

- The two new `STATIC` suites include fail-closed forbidden-literal assertions for PostgreSQL/HTTP URLs, credential terms, signed URL terms, and private user paths.
- The pre-staging PowerShell `Select-String` scan over the schema, migration, and two new specs found no URL or credential pattern matches and exited 0.
- The focused static run passed with 2 test files and 10 tests, including the no-`INSERT INTO`, no-`CREATE FUNCTION`, and no-`CREATE TRIGGER` assertions.

## Migrate-Diff Review

- The from-empty Prisma diff exited 0 and matched the quote enum, table columns, PostgreSQL types, relation targets/actions, named pair unique, and two read indexes at the declarative level.
- The hand-authored migration remains authoritative for the three named integrity checks because Prisma schema datamodels do not declare those checks.
- The migration retains the established server-side `gen_random_uuid()` default; the from-empty diff omits it for Prisma's client-side `@default(uuid())` declaration, as it does for the earlier UUID models.
- Explicit `ASC` terms on the directed indexes are retained by the migration contract while Prisma diff omits default ascending directions; `NUMERIC` and Prisma-emitted `DECIMAL` are the same PostgreSQL numeric type.
- Index statement order differs only because Prisma emits the directed indexes before the pair unique; names and definitions are unchanged.
- `migration_lock.toml` and migrations #1–#3 were not modified.

## Quality and Commit-State Record

- Format check, lint, typecheck, full test, and build gates passed with exit 0; Prisma's package configuration deprecation notice and the existing Next ESLint pages-directory warning were non-failing tool output.
- The intended staging set is limited to `schema.prisma`, migration #4, the two new specs, the two count-only spec updates, and `openspec/changes/cotizaciones/`; generated output and `migration_lock.toml` are excluded.
- The exact commit subject is `chore: add quote persistence`; push is not part of this phase.

## Final Authored Count

- Implementation workset: **245 authored changed lines** (additions plus deletions): 29 schema additions, 26 migration additions, 93 lines in each new static spec, and one replacement line in each existing count-only spec.
- Generated Prisma output is excluded and remains untracked/ignored. Planning artifacts and this process record are persisted as requested but are excluded from the implementation review-line count.
- The full required staged snapshot, including the active change records, is **936 changed lines** (+934/−2), above the 400-line review budget because those records are required staging inputs; no implementation content was compressed, and the explicit SINGLE COMMIT / PROCEED resolution remains in force without a `size:exception` request.

## Live Gate

**UNSATISFIED / RECORDED PENDING:** migrations #1–#4 apply, re-apply, status, and seed execution have not run because no disposable PostgreSQL database is available. Unique-index race/concurrency proof is live-only and remains pending. Quote lifecycle transitions and availability revalidation are API-owned under ADR-0015 in backlog work #23/#28/#31; this persistence change intentionally adds no transition triggers or endpoint behavior.

## Issues and Deviations

- The documented workspace `npm --prefix apps/api exec prisma ... --schema prisma/schema.prisma` form resolved its schema path relative to the workspace and failed once; the equivalent commands run from `apps/api` with the same temporary environment succeeded with exit 0. No source or design deviation resulted.
- Otherwise, implementation matches `design.md`; no unrelated physical fields, prior migrations, or provider lock entries were changed.
