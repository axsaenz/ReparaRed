# Apply Progress: Service and Review Persistence

## Delivery Resolution

- Forecast: **High** risk; the planned implementation was estimated at 340–430 authored lines and chaining was recommended.
- Resolution: **`size:exception` APPROVED** by the orchestrator. This is one cohesive local unit and one commit; no remote or chained PR is used.
- Delivery boundary: amended service/review Prisma schema, migration #5, `STATIC` contracts, compatibility count updates, quality gates, and OpenSpec records only.
- Rollback: revert the single implementation commit; no local database data was created.

## Prior Blocked Attempt and Resolution

- A previous apply batch was blocked by Prisma 6.19.3 error P1012: the composite one-to-one relation required defining-side uniqueness on `Service`.
- The orchestrator reverted that batch completely, leaving the workspace clean for this retry.
- The amended design added `@@unique([selectedQuoteId, requestId], map: "services_selected_quote_id_request_id_key")` and its migration index. This retry used that amended shape and did not take the independent-FK fallback.

## Execution Mode

- Apply state at start: `ready`.
- Artifact store: OpenSpec file-based persistence.
- Testing mode: Standard mode (`strict_tdd: false`).
- Runtime harness: `STATIC` Vitest contracts and Prisma CLI checks; live PostgreSQL proof remains pending.

## Completed Tasks

- [x] 1.1 Added the amended `ServiceStatus`, `Service`, `Review`, reverse relations, quote composite target, and directed service index to the Prisma schema.
- [x] 1.2 Ran Prisma validation and client generation with invocation-only `DIRECT_URL`; both exited 0.
- [x] 2.1 Added hand-authored migration #5 with named service/review constraints, composite quote target, checks, restrictive FKs, and immutability trigger; it contains zero rows.
- [x] 2.2 Preserved the existing migration lock and all pre-existing migrations; the new migration is additive and hand-authored.
- [x] 3.1 Added the two `STATIC` service/review schema and migration contracts.
- [x] 3.2 Updated all three prior model-count assertions from 10 to 12 and ran the workspace tests successfully.
- [x] 4.1 Reviewed the from-empty Prisma diff against the hand-authored migration and recorded the differences below.
- [x] 4.2 Passed the literal/secrets RED scan, format check, lint, typecheck, workspace test, and build gates.
- [x] 4.3 Passed commit-state RED, explicitly staged only the intended implementation and change-root artifacts, created the exact single commit, and verified a clean tree.
- [x] 5.1 Created this progress record with static evidence, authored count, and the pending live-gate statement.
- [x] 5.2 Recorded the API/DB enforcement split required by ADR-0015 and the later backlog items.

## Work Unit Evidence

| Work unit | Focused test command and exact result | Runtime harness command/scenario and exact result | Rollback boundary |
|---|---|---|---|
| Schema and generation | From `apps/api`, with temporary invocation-only `DIRECT_URL`: `npm exec -- prisma validate --schema=prisma/schema.prisma` and `npm exec -- prisma generate --schema=prisma/schema.prisma`; both exited 0, schema valid, Prisma Client 6.19.3 generated. | `N/A` — no disposable PostgreSQL instance is available; these commands validate and generate the schema without exercising a database. | Revert the service/review schema additions and the generated client remains ignored/untracked. |
| Static contracts | From `apps/api`: `npm exec -- vitest run src/database/service-review-schema.spec.ts src/database/service-review-migration.spec.ts`; 2 files passed and 12 tests passed, exit 0. Workspace `npm test` also passed with 21 files and 126 tests. | `N/A` — both suites intentionally inspect schema and migration text only; no executed SQL boundary exists offline. | Revert the two new static suites and the three count-only compatibility updates. |
| Diff and quality gates | `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` from the workspace root all exited 0. | `npm exec -- prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` from `apps/api` exited 0; live migration apply/re-apply/status and seed behavior remain pending. | Revert the single implementation commit and its required change-root records. |

## RED Evidence

- The pre-staging PowerShell `Select-String` scan covered `schema.prisma`, migration #5, and both new static suites for PostgreSQL/HTTP URLs, credential-like terms, signed-URL terms, and private user paths; it exited 0 with **0 forbidden literal matches**.
- The migration scan and `STATIC` tests found **0 `INSERT INTO` statements**. The tests also assert the exact five restrictive FKs, checks, composite target, trigger/function names, and Review createdAt-only shape.
- Commit-state RED passed after explicit staging. The staged implementation names were limited to `schema.prisma`, migration `20260901000003_services_reviews`, the two new suites, and the three updated suites; the staged change-root names were the required OpenSpec artifacts only. Generated Prisma output, `node_modules`, build output, and the migration lock were excluded.

## Migrate-Diff Review

- The from-empty Prisma diff exited 0 and represented the twelve declarative models, `ServiceStatus`, service/review columns, relation targets/actions, named declarative uniques, and directed indexes.
- The hand-authored migration remains authoritative for the three service/review checks, because Prisma datamodel diff does not emit those checks, and for `prevent_review_modification()` plus `reviews_immutable`, which are intentionally outside the Prisma datamodel.
- Prisma emitted the quote composite target and service composite uniqueness as `CREATE UNIQUE INDEX` statements in the from-empty output; the migration uses the required named quote `ALTER TABLE ... ADD CONSTRAINT` and service composite unique index, preserving the same uniqueness semantics and satisfying the amended Prisma relation.
- The established migration `gen_random_uuid()` defaults and explicit `ASC` index directions are retained by the hand-authored migration; Prisma's from-empty output omits client-side UUID defaults and default ascending directions. `NUMERIC` and Prisma-emitted `DECIMAL` are the same PostgreSQL numeric type.
- The existing migration lock and all pre-existing migrations were unchanged. The from-empty diff is a whole-schema declarative comparison, not a replacement for migration #5.

## Quality and Commit-State Record

- Format check, lint, typecheck, full workspace test, and build gates passed with exit 0. Prisma's package-configuration deprecation notice and the existing Next ESLint pages-directory warning were non-failing output.
- The exact commit subject is `chore: add service and review persistence`; no `commit -a` and no push were used.
- The final tree was verified clean after the single commit.

## Final Authored Count

- Implementation workset: **376 authored changed lines** (**372 additions, 4 deletions**) across the schema, migration, two new static suites, and three count-only suite updates.
- Generated Prisma output is excluded from the authored count and was not staged.
- The explicit **`size:exception`** resolution is recorded and honored as one cohesive unit/one commit without compressing code, tests, documentation, or records.

## Enforcement Split

- Service transitions and actors, cancellation authorization, review eligibility, and selection transaction behavior are API-owned under ADR-0015 in backlog items #31 and #34–#38.
- Database final defenses in this change are the request/quote/service uniques, the `(selected_quote_id, request_id)` composite FK, cancellation and rating checks, and the immutable review trigger. No transition or authorization trigger was added.

## Pending Live Gate

**UNSATISFIED / RECORDED PENDING:** migrations #1–#5 apply → re-apply → status, seed execution, review trigger behavior, and unique/concurrency behavior have not been executed against disposable PostgreSQL. All evidence in this record is static/offline evidence only; static contracts are not live proof.

## Deviations and Issues

- None from the amended design; the Prisma-required composite unique amendment was implemented exactly and no fallback was used.
- The first attempted `rg` scan was unavailable in this environment; the equivalent required PowerShell `Select-String` RED scan passed with zero matches.

## Remaining Tasks

- No implementation tasks remain; all 11 assigned tasks are complete.
- The live PostgreSQL gate is carried forward as unsatisfied and must be run during independent verification when disposable database infrastructure is available.
