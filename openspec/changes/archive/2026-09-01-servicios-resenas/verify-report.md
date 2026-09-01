```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:e1ca322f06307603692d01389970dde3820c47642566d9b0cbc89332fe34c444
verdict: pass
blockers: 0
critical_findings: 0
requirements: 10/10
scenarios: 20/20
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:ba49f74ac222ac901e11df2dfe0076c1e35d923b9b9592301064599f7f6fb386
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:bc04e62c9efe1e0c182ca4829f5258e2df32dc645aa3643110a3584382ffe00b
```

## Verification Report

**Change**: `servicios-resenas`  
**Acceptance source**: `openspec/changes/servicios-resenas/specs/service-review-persistence/spec.md`  
**Mode**: Standard; offline verification by contract, with live-gate scenarios recorded pending  
**Verifier**: Independent `sdd-verify` execution

### Completeness

| Metric | Value |
|---|---:|
| Requirements | 10 |
| Scenarios | 20 |
| Tasks total | 11 |
| Tasks complete | 11 |
| Tasks incomplete | 0 |

All task checkboxes in `tasks.md` are checked. The retrieved specification contains exactly ten `### Requirement:` headings and twenty `#### Scenario:` headings.

### Build and Test Execution

| Command | Exit | Observed result | Output hash |
|---|---:|---|---|
| `npm exec --workspace=@repara/api -- vitest run src/database/service-review-schema.spec.ts src/database/service-review-migration.spec.ts` | 0 | 2 files passed; 12 tests passed; all suites are labeled `STATIC` | `sha256:7b621d0683c23110c2f88451cc81b2df2b487d1a02180b107d452d1e66ee1982` |
| `npm test` after the required Prisma client generation | 0 | Web: 1 file and 1 test passed. API: 21 files and 126 tests passed. | `sha256:ba49f74ac222ac901e11df2dfe0076c1e35d923b9b9592301064599f7f6fb386` |
| `npm run lint` | 0 | Web and API lint passed. Existing Next pages-directory warning and npm stderr noise were non-failing. | `sha256:7c7af65f44fcff070653ace0905d56bd0107883b63d44f7e15cbb151ff0e7066` |
| `npm run format:check` | 0 | All files matched Prettier style. | `sha256:bee0edd1dba9ac09a7df20fe732dde5596ec543942380a3ac131445feae359f1` |
| `npm run typecheck` | 0 | Web and API TypeScript checks passed. | `sha256:d9b4193cda90bb247afa512c0f886e631b056f2b28cfd5605b4484b55a87d002` |
| `npm run build` | 0 | Next production build and API TypeScript build passed. | `sha256:bc04e62c9efe1e0c182ca4829f5258e2df32dc645aa3643110a3584382ffe00b` |
| `npm ci` | 0 | Clean install completed; `package-lock.json` hash stayed `fa844f769d688f55c40ba24d9dcb3ae86fb5ac6885ba33ba3a774ea5014773a2`. | `sha256:f1f8d08d20aa753df8682dfe2791e2de35b3c76282e2b9a5a8dbf32b3a8c6d75` |

Prisma commands ran from `apps/api` with an invocation-only dummy `DIRECT_URL`; no real database was used:

| Command | Exit | Observed result | Output hash |
|---|---:|---|---|
| `npm exec -- prisma validate --schema=prisma/schema.prisma` | 0 | Prisma 6.19.3 accepted the schema. | `sha256:df29e6f7d77a060e747ae17f7d1bb35c285d3cfc6fd660a7a1e49550586543a5` |
| `npm exec -- prisma generate --schema=prisma/schema.prisma` | 0 | Prisma Client 6.19.3 generated successfully. | `sha256:07b9f8a681b083bd0feb04dfa39da6daa3078cc03838b94b3f510841db62b37c` |
| `npm exec -- prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` | 0 | Whole-schema declarative diff generated successfully; spot comparison is recorded below. | `sha256:18630b70ae1a3150eb8ec1e9b6184ba3efb6ea7d855a5cefbc5f9a4d6d6fb650` |

After `npm ci`, an immediate `npm test` without regenerating Prisma Client failed with 7 suites unable to resolve `.prisma/client/default` (82 tests executed). The mandated `prisma generate` from `apps/api` restored the generated client, after which the final full test command passed 21/21 files and 126/126 tests. This is recorded as a setup warning, not an implementation failure.

Coverage was not configured; the project threshold is zero.

### Requirement Verification

| Requirement | Commands and observed result | Status |
|---|---|---|
| R1 Service integrity and same-request defense | Targeted `STATIC` Vitest plus source audit. `services.request_id` and `services.selected_quote_id` are `NOT NULL`; `services_selected_quote_id_request_id_fkey` references `quotes(id, request_id)` with `ON DELETE RESTRICT`; migration #5 adds `quotes_id_request_id_key`. Migration #4 diff is empty. | **PASS (STATIC)** |
| R2 Service/review cardinality | Targeted `STATIC` Vitest plus source audit. `services_request_id_key`, `services_selected_quote_id_key`, `services_selected_quote_id_request_id_key`, and `reviews_service_id_key` are present in schema and migration. | **PASS (STATIC)** |
| R3 Lifecycle states | Targeted `STATIC` Vitest plus trigger audit. `ServiceStatus` is exactly `{SCHEDULED, IN_PROGRESS, AWAITING_CONFIRMATION, COMPLETED, CANCELLED}` and the service default is `SCHEDULED`. The only `CREATE TRIGGER` is `reviews_immutable`; no service transition trigger exists. | **PASS (STATIC)** |
| R4 Cancellation integrity | Targeted `STATIC` Vitest plus exact SQL audit. `services_state_consistency` couples cancellation fields all-or-nothing with `status = 'CANCELLED'`; `services_cancellation_reason_check` trims and bounds reasons to 10–500; the cancellation actor FK is restrictive. | **PASS (STATIC)** |
| R5 Scheduled UTC discipline | Targeted `STATIC` Vitest plus SQL check audit. `scheduled_at` is required `TIMESTAMPTZ(6)`. No clock function occurs in a check; `CURRENT_TIMESTAMP` occurs only in column defaults. | **PASS (STATIC)** |
| R6 Review integrity | Targeted `STATIC` Vitest plus SQL audit. Review has required unique `service_id`, restrictive service/client FKs, integer rating with `BETWEEN 1 AND 5`, nullable `VARCHAR(1000)` comment, and a creation default. | **PASS (STATIC)** |
| R7 Review immutability | Targeted `STATIC` Vitest passed assertions for `prevent_review_modification()`, `reviews_immutable`, `BEFORE UPDATE OR DELETE`, and Review's absence of `updatedAt`. | **PASS (STATIC)** |
| R8 Technician resolution | Targeted `STATIC` Vitest and direct model-block audit. `Service` and `Review` contain no `technicianId`, average, score, or reputation field; the selected quote relation preserves the normalized resolution path. | **PASS (STATIC)** |
| R9 Migration contract | Prisma validate and from-empty diff exited 0. Migration order is baseline, identity, requests/images, quotes, services/reviews; the provider lock and prior migration paths are unchanged; no `INSERT INTO` exists. Dummy-only `prisma migrate status` returned P1001 because no database server exists. | **PASS (STATIC); live gate RECORDED PENDING** |
| R10 Offline evidence | Targeted contracts passed 2 files/12 tests; compatibility assertions are all 12 models; final workspace test passed 21 files/126 tests. Static labels are present and evidence does not claim SQL, trigger, or concurrency proof. | **PASS (STATIC); live gate RECORDED PENDING** |

### Scenario Compliance Matrix

The acceptance source explicitly requires offline verification. The following matrix records static coverage without upgrading it to executed-SQL or concurrency evidence. The two live-gate scenarios are recorded pending as required.

| Requirement | Scenario | Covering evidence | Result |
|---|---|---|---|
| R1 | Happy | `service-review-schema.spec.ts`: exact Service fields and mappings; migration audit: service table | **PASS (STATIC)** |
| R1 | Edge | Composite relation assertion and named restrictive composite FK assertion | **PASS (STATIC)** |
| R2 | Happy | Named request and selected-quote uniqueness assertions | **PASS (STATIC)** |
| R2 | Edge | Unique constraint/index assertions for duplicate boundaries | **PASS (STATIC)** |
| R3 | Happy | Exact enum and default assertions | **PASS (STATIC)** |
| R3 | Edge | Enum membership and no-transition-trigger audit; transition adjudication remains API-owned | **PASS (STATIC)** |
| R4 | Happy | Exact cancellation predicate and reason-bound assertions | **PASS (STATIC)** |
| R4 | Edge | All-or-nothing predicate, trimmed bounds, and restrictive actor FK assertions | **PASS (STATIC)** |
| R5 | Happy | Required `TIMESTAMPTZ(6)` scheduled field assertion | **PASS (STATIC)** |
| R5 | Edge | No-clock-check audit; future validation remains selection-owned | **PASS (STATIC)** |
| R6 | Happy | Review fields, creation default, and relation assertions | **PASS (STATIC)** |
| R6 | Edge | Rating bound, comment cap, unique service, and restrictive FK assertions | **PASS (STATIC)** |
| R7 | Happy | Created-at-only Review shape assertion | **PASS (STATIC)** |
| R7 | Edge | Function, trigger, and update/delete event assertions | **PASS (STATIC)** |
| R8 | Happy | Service-to-quote relation and normalized-field assertions | **PASS (STATIC)** |
| R8 | Edge | Direct technician/average field exclusion assertions | **PASS (STATIC)** |
| R9 | Happy | Migration static suite, migration order, lock/history diffs, Prisma validate, and from-empty diff | **PASS (STATIC)** |
| R9 | Edge | No disposable PostgreSQL; dummy status probe returned P1001 | **PENDING-RECORDED** |
| R10 | Happy | Static-labeled contracts and full workspace test | **PASS (STATIC)** |
| R10 | Edge | Offline boundary preserved; live SQL/trigger/concurrency proof is unavailable | **PENDING-RECORDED** |

**Compliance summary**: 20/20 scenarios have an accepted offline disposition; 18 are statically passing and 2 are explicitly `PENDING-RECORDED` live-gate scenarios.

### Normative Construct Comparison

| Construct | Normative design | Committed implementation | Result |
|---|---|---|---|
| Enum and default | Five exact `ServiceStatus` members; service default `SCHEDULED` | Schema and migration match exactly | PASS |
| Same-request defense | Quote unique target plus Service composite relation | `quotes_id_request_id_key`, composite Service unique, and restrictive composite FK are present | PASS |
| Service table | Required UUID/request/quote/schedule/status fields, cancellation tuple, timestamps, named keys/checks | All columns, names, defaults, and checks are present | PASS |
| Service cardinality/index | Unique request, unique selected quote, composite unique, descending status/created index | All four structures and directed index are present | PASS |
| Review table | Unique service, client, integer rating, nullable 1000-character comment, createdAt only | Schema and migration match; no `updatedAt` | PASS |
| Review defense | Restrictive service/client FKs and rejecting update/delete trigger | Five total restrictive FKs, function, and `reviews_immutable` trigger are present | PASS |
| Seed/history | No inserts; append migration #5; preserve #1–#4 and provider lock | Migration contains zero inserts; prior history and lock are unchanged | PASS |

The from-empty declarative diff also showed the expected differences from the hand-authored migration: it omits manual cancellation/rating checks and the trigger/function, omits client-side UUID defaults, omits explicit ascending index directions, and represents the composite quote target as a unique index rather than the normative named table constraint. These are the documented, tolerated manual/representation differences; no required declarative construct was missing.

### Amendment Scrutiny

The 2026-09-01 amendment addresses Prisma 6.19.3 P1012: a composite one-to-one relation requires defining-side uniqueness. The committed schema contains `@@unique([selectedQuoteId, requestId], map: "services_selected_quote_id_request_id_key")`, migration #5 creates the corresponding unique index, and the static schema contract asserts it. Independent `prisma validate` exited 0, so the composite-FK path was retained and no fallback to independent FKs was taken. The amendment is limited to the Prisma-required uniqueness structure and its contract coverage; it does not add commands, transition triggers, technician duplication, seeds, or other scope.

### Pending-Gate Audit

The following remain **UNSATISFIED / RECORDED PENDING**, consistent with the acceptance source and design:

- Migrations #1–#5 apply, re-apply, and status against disposable PostgreSQL.
- Seed execution against disposable PostgreSQL.
- Executed review-trigger behavior.
- Executed uniqueness and concurrency behavior.

The invocation-only dummy status probe returned `P1001: Can't reach database server`; it is evidence that no live database was available, not live acceptance. All static contracts explicitly use `STATIC` labels, and this report does not claim SQL execution, trigger behavior, or race/concurrency proof.

### Scope Discipline

- Commit `379d6de` is on branch `main` with subject `chore: add service and review persistence`.
- The implementation diff is 372 additions and 4 deletions, or 376 authored changed lines, matching the approved `size:exception` work unit.
- Changed implementation files are limited to the Prisma schema, migration #5, two new static suites, and three compatibility count updates; the expected OpenSpec change artifacts are also in the commit.
- `migration_lock.toml`, migrations #1–#4, canonical `openspec/specs/`, `package.json`, `package-lock.json`, seeds, generated output, API modules, and web code were not changed by the commit.
- The service/review production-file literal scan found zero forbidden URL, credential-like, signed-URL, or private-path literals.
- `git diff --check` exited 0. The worktree was empty before report persistence; the required `verify-report.md` is the intentional verification artifact created after that clean-tree check.

### Issues Found

**CRITICAL**: None.  
**WARNING**:

1. The live PostgreSQL gate is unavailable and remains explicitly `RECORDED PENDING`; static evidence must not be treated as live proof.
2. A clean `npm ci` removes ignored generated Prisma Client output, so `npm test` requires the explicit Prisma generation step first. The documented verification sequence performs that step and passes all tests.

**SUGGESTION**: Consider adding a non-mutating pretest generation step or documented clean-install command sequence in a future maintenance change; this is outside the current persistence scope.

### Overall Verdict

**PASS WITH WARNINGS**

All ten requirements and twenty scenarios meet the requested offline acceptance disposition. The schema, migration, amendment fix, static contracts, compatibility counts, Prisma validation/diff, quality gates, clean install, and final test suite passed independently. The only warnings are the intentionally unavailable live database gate and the clean-install generated-client sequencing requirement.

### Archive Notes

The implementation is ready for `sdd-archive`. Preserve this report and the explicit pending-gate language in the archive audit trail. Do not mark migrations, seed, trigger, or concurrency behavior as live-proven until disposable PostgreSQL evidence is available.
