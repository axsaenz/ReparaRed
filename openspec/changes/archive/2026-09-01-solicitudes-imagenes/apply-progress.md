# Apply Progress: Request and Image Persistence

## Delivery resolution

- Forecast: **High** risk; 420–520 authored implementation lines; chained delivery recommended.
- Resolution: **`size:exception` APPROVED** by the orchestrator. The change is one cohesive implementation unit and one commit; no remote or chained PR is used.
- Mode: **Standard** (`strict_tdd: false`).
- Rollback boundary: revert the single implementation commit, which removes the request persistence schema block, migration #3, static contracts, the compatibility assertion update, and this change's records.

## Completed tasks

- [x] 1.1 Request persistence enums, models, mappings, constraints, indexes, and reverse relations added to Prisma schema.
- [x] 1.2 Prisma validation and client generation passed with invocation-only disposable `DIRECT_URL`.
- [x] 2.1 Hand-authored migration #3 added with the normative DDL and zero rows.
- [x] 2.2 Existing migration history and `migration_lock.toml` verified unchanged.
- [x] 3.1 Forbidden-literal RED scans added to both new static contract suites.
- [x] 3.2 Static schema contract added for the request persistence shape.
- [x] 3.3 Static migration contract added for checks, indexes, foreign keys, and no inserts.
- [x] 3.4 Workspace tests passed without claiming executed-SQL proof.
- [x] 4.1 Prisma diff commands were run and the declarative output was reviewed against migration #3.
- [x] 4.2 Schema, migration, and contract files passed the literal/secrets RED scan.
- [x] 4.3 Format, lint, typecheck, test, and build gates passed.
- [x] 4.4 Commit-state RED passed on the final staged snapshot; the single commit and clean-tree verification are the final delivery steps.
- [x] 5.1 This progress record was created with static evidence and the pending live-gate statement.

## Work Unit Evidence

| Work unit | Focused command and exact result | Runtime harness command/scenario and exact result | Rollback boundary |
|---|---|---|---|
| Schema | From `apps/api`: `npm exec -- prisma validate` and `npm run prisma:generate`, with a temporary invocation-only `DIRECT_URL`; both exited 0. | `N/A` — no disposable PostgreSQL was available; Prisma CLI validation/generation is the available static boundary. | Revert the added schema enums, relations, and models; generated client output is ignored and untracked. |
| Migration | From `apps/api`: `npm exec -- vitest run src/database/request-image-migration.spec.ts`; 1 file and 5 tests passed, exit 0. | `STATIC` migration-text contract; SQL was not executed because no disposable PostgreSQL was available. | Remove `apps/api/prisma/migrations/20260901000001_requests_images/`. |
| Contracts and quality gates | `npm exec -- vitest run src/database/request-image-schema.spec.ts src/database/request-image-migration.spec.ts`; 2 files and 11 tests passed, exit 0. Workspace `npm test`; 17 files and 104 tests passed, exit 0. | `STATIC` schema/migration contracts plus Prisma CLI checks; no executed-SQL or live-PostgreSQL scenario was available. | Revert both request-image contracts and the necessary existing model-count assertion update. |

## RED evidence

- **Forbidden literals:** the scan over `schema.prisma`, migration #3, and both request-image contract files found zero matches for database/HTTP URL forms, credential-like words, signed URL forms, or user-upload path forms.
- **Migration contents:** the migration scan found zero `INSERT INTO` statements.
- **Commit-state RED:** explicit staging passed on the final snapshot; staged names are limited to the intended schema, migration #3, request-image contracts, the necessary compatibility assertion, and change-root artifacts. Generated Prisma output, `node_modules`, and `dist` are excluded.

## Quality-gate evidence

| Command | Result |
|---|---|
| Root `npm run format:check` | Exit 0; all files matched Prettier style. |
| `apps/api` `npm run lint` | Exit 0. |
| `apps/api` `npm run typecheck` | Exit 0. |
| Root `npm test` | Exit 0; web 1 file/1 test and API 17 files/104 tests passed. |
| `apps/api` `npm run build` | Exit 0; Prisma client generation and TypeScript compilation passed. |

## Prisma diff review

- `npm exec -- prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script` was executed with invocation-only `DIRECT_URL`. Prisma 6.19.3 stopped before producing the comparison because a migrations-directory diff requires `--shadow-database-url`; no disposable PostgreSQL was available to provide that boundary.
- `npm exec -- prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` exited 0. Its declarative output contains the existing schema plus the new enums, tables, columns, defaults, indexes, and six new foreign keys represented by migration #3.
- The hand-authored migration remains authoritative for the named same-row checks and the reserved-expiry partial index, which the declarative diff does not emit. Enum ordering and the established `gen_random_uuid()` migration defaults are retained intentionally. The from-empty output also includes the earlier migration history, so it is not itself a replacement for migration #3.
- No migration-lock or prior migration file was changed. The migration contains zero seed rows.

## Design boundaries and deviations

- The request transition matrix and the three-image capacity count are API-owned under ADR-0015 request-row locks in later items #17, #19, and #22; they are **not** enforced by this migration by design.
- The live migration/seed gate is intentionally not claimed as passed. No endpoint, Storage call, signed URL, trigger, cross-row count check, or seed change was added.
- One existing static test assertion was updated from six to nine declared models because adding the three required persistence models otherwise made the pre-existing identity contract fail. No existing physical schema field was changed.
- Apart from that compatibility assertion update, implementation matches the normative design.

## Final authored count

- Implementation delta: **455 authored lines** (454 additions and 1 deletion) across the schema, migration, request-image contracts, and the necessary compatibility assertion update.
- Complete staged snapshot: **1,359 authored lines** (1,358 additions and 1 deletion), including 904 lines of required OpenSpec change records.
- The approved **`size:exception`** resolution permits the complete change to land as one cohesive unit without compressing code, tests, documentation, or records.

## Pending live gate

**ALL UNSATISFIED / RECORDED PENDING:** migrations #1–#3 apply→re-apply→status + seed execution remain unverified without disposable PostgreSQL. All evidence in this record is static/offline evidence only.
