```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:2d499d1081bfb07f1c3f6f4ab99d9e35ad6a6f20b0b7de6c89c1586dc1a818f2
verdict: pass
blockers: 0
critical_findings: 0
requirements: 10/10
scenarios: 20/20
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:9dfd44c3ec76e9f6fa4da87ee6e18df7a69cc47eed5cedd029054aa7157e6bdb
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:b9fef3440f9282029bc9d4b75b90a8bff910be80a47118308060b7214ee7cb97
```

## Verification Report

**Change**: `solicitudes-imagenes`  
**Version**: `request-image-persistence` — 10 requirements, 20 scenarios  
**Mode**: Standard; offline-only verification as required by the change  
**Verifier independence**: Apply evidence was not trusted; all listed commands and source checks were re-run in a fresh verification pass.

### Completeness

| Metric | Value |
|---|---:|
| Tasks total | 13 |
| Tasks complete | 13 |
| Tasks incomplete | 0 |

All checklist items in `tasks.md` are checked. The live PostgreSQL migration/seed gate is intentionally not a task-completion blocker for this offline slice.

### Build and Tests Execution

| Command | Exit | Observed result |
|---|---:|---|
| `npm ci` (workspace root) | 0 | Installed 512 packages; npm emitted deprecation, audit, and blocked-install-script notices. |
| `npm exec --workspace=@repara/api -- vitest run src/database/request-image-schema.spec.ts src/database/request-image-migration.spec.ts` | 0 | 2 files passed; 11 tests passed. |
| `npm test` (workspace root) | 0 | `apps/web`: 1 file/1 test passed; `apps/api`: 17 files/104 tests passed. |
| `npm run format:check` (workspace root) | 0 | All files matched Prettier style. |
| `npm run lint` (workspace root) | 0 | Web and API lint completed; the existing Next pages-directory informational warning was emitted. |
| `npm run typecheck` (workspace root) | 0 | Web and API type checks passed. |
| `npm run build` (workspace root) | 0 | Web production build, Prisma generation, and API TypeScript build passed. |
| `npm exec -- prisma validate` (from `apps/api`, temporary dummy `DIRECT_URL`) | 0 | Prisma schema valid. |
| `npm run prisma:generate` (from `apps/api`, temporary dummy `DIRECT_URL`) | 0 | Prisma Client 6.19.3 generated successfully. |
| `npm exec -- prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` (from `apps/api`, temporary dummy `DIRECT_URL`) | 0 | Declarative SQL emitted successfully. |
| `npm exec -- prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script` | 1 | Prisma required `--shadow-database-url`; no disposable PostgreSQL or shadow database was supplied. This is recorded as unavailable evidence, not as a product migration failure. |

The first full test invocation immediately after `npm ci` encountered missing generated Prisma client files because npm 12 blocked package install scripts in this environment. After the explicitly required invocation-only `prisma generate`, the independent full-suite rerun passed with 104 API tests and 1 web test. No environment value was written to the workspace.

**Coverage**: Not available; no coverage threshold is configured for this change.

### Per-Requirement Verification

| Requirement | Commands / source inspected | Observed result | Result |
|---|---|---|---|
| R1 Request aggregate | Static Vitest suites; `schema.prisma`; migration #3 | `requests` has client/category/district references, bounded `VARCHAR(120)`/`VARCHAR(2000)` fields, required `TIMESTAMPTZ(6)` `preferred_at`, timestamps, exact trimmed text checks, and three restrictive reference FKs. Static suites passed. | PASS |
| R2 Lifecycle states | Static Vitest suites; enum/check inspection; migration grep for functions/triggers | `RequestStatus` is exactly `DRAFT`, `PUBLISHED`, `ASSIGNED`, `CANCELLED`; schema default is `DRAFT`; `published_at` is nullable; exact NULL-for-DRAFT consistency predicate exists; migration #3 contains no transition trigger/function. Later transition behavior remains API-owned. | PASS |
| R3 Cancellation fields | Migration exact-predicate test; schema model inspection | Nullable cancellation timestamp, user UUID, and `VARCHAR(500)` reason are present; reason is trimmed 10–500 when present; exact all-or-nothing cancellation consistency predicate and restrictive `users.id` FK exist. | PASS |
| R4 Reservations | Static Vitest suites; reservation model/table inspection; enum and column grep | Reservation request FK is restrictive, object key is unique, declared size is positive-checked, content type is `VARCHAR(100)`, status is exactly `RESERVED`/`CONFIRMED` with default `RESERVED`, expiry is required, and `confirmed_at` is state-consistent. No created/updated fields or durable `EXPIRED` state exist. | PASS |
| R5 Images | Static Vitest suites; image model/table inspection | `request_images` has restrictive request FK, unique object key, allowed MIME check, 1..5,242,880 byte check, position >= 1, unique `(request_id, position)`, timestamps, and no status column. | PASS |
| R6 Object-key discipline | Schema/migration forbidden-literal scans; unique/index inspection | Only stable object-key metadata columns are persisted. No signed URL, bucket, credential, or user-path column/literal exists in the production schema or migration; unique names are table-scoped and there is no registry. | PASS |
| R7 Cardinality split | Static suite; migration grep for `CREATE FUNCTION`, `CREATE TRIGGER`; design/apply records | Migration #3 has no function or trigger and no cross-row count enforcement. Design and apply records explicitly assign the three-image reservation-plus-image count to later API transactions under request-row locks. | PASS |
| R8 Referential integrity | Migration FK grep/count; schema `deletedAt`/`deleted_at` grep | Exactly six new migration #3 FKs were found; all six have `ON DELETE RESTRICT ON UPDATE CASCADE`. No business-path cascade or deleted-at field was found. | PASS |
| R9 Migration contract | Migration directory listing; `migration_lock.toml`; Prisma validate; from-empty diff; pending wording grep | Order is baseline -> `20260901000000_identity_profiles` -> `20260901000001_requests_images`; provider remains PostgreSQL; validation and from-empty diff exit 0. Named declarative objects match migration #3, with only tolerated UUID-default representation and hand-authored checks/partial index differences. The full-history diff requires a shadow database and remains unavailable offline. Pending wording explicitly names `UNSATISFIED`, migrations #1–#3, and seed execution. | pending-recorded |
| R10 Offline evidence | Direct static-suite command; `npm test`; `STATIC` grep; apply/proposal inspection | Both contract files are labeled `STATIC`; direct contracts pass 2 files/11 tests; final workspace suite passes web 1 test plus API 104 tests. Evidence and records do not claim executed-SQL proof. | PASS |

### Spec Compliance Matrix

All 20 scenarios were counted from the retrieved specification and mapped below. Runtime evidence means the static contract tests executed successfully; it does not mean SQL was executed against PostgreSQL.

| Requirement | Scenario | Covering evidence | Result |
|---|---|---|---|
| R1 | Happy | `request-image-schema.spec.ts` metadata/mapping assertions and migration table/field inspection | COMPLIANT — STATIC |
| R1 | Edge | Migration title/description checks and restrictive FK assertions | COMPLIANT — STATIC |
| R2 | Happy | Enum/default/state-consistency assertions; no-trigger inspection | COMPLIANT — STATIC boundary; later transition is deferred by design |
| R2 | Edge | Exact enum membership and published-state predicate assertions | COMPLIANT — STATIC |
| R3 | Happy | Cancellation field and consistency predicate assertions | COMPLIANT — STATIC |
| R3 | Edge | All-or-nothing predicate and restrictive actor-FK assertions | COMPLIANT — STATIC |
| R4 | Happy | Reservation table, enum, expiry, and confirmed-state assertions | COMPLIANT — STATIC |
| R4 | Edge | Positive-size, state-consistency, and no-`EXPIRED` inspection | COMPLIANT — STATIC |
| R5 | Happy | Image table, MIME/size/position, and uniqueness assertions | COMPLIANT — STATIC |
| R5 | Edge | Exact bad-metadata rejection checks represented by named database predicates and unique indexes | COMPLIANT — STATIC |
| R6 | Happy | Table-scoped unique object-key indexes and production forbidden-literal scan | COMPLIANT — STATIC |
| R6 | Edge | Static forbidden URL/credential/path scans in both contract suites | COMPLIANT — STATIC |
| R7 | Happy | API-owned locked-count rule documented in design/apply records | COMPLIANT — STATIC/docs; later API behavior deferred |
| R7 | Edge | Migration contains no function, trigger, or cross-row count construct | COMPLIANT — STATIC |
| R8 | Happy | Six restrictive FK clauses and ordered-cleanup boundary inspection | COMPLIANT — STATIC |
| R8 | Edge | All six FK actions independently counted as RESTRICT/CASCADE pairs | COMPLIANT — STATIC |
| R9 | Happy | Named migration types, tables, checks, indexes, and FKs compared with design | COMPLIANT — STATIC |
| R9 | Edge | `ALL UNSATISFIED / RECORDED PENDING` wording verified for migrations #1–#3 plus seed | COMPLIANT — pending-recorded |
| R10 | Happy | Direct contract suite passed and all contract tests carry `STATIC` labels | COMPLIANT — STATIC |
| R10 | Edge | Static-only limitation and pending gate remain explicit in records | COMPLIANT — STATIC/pending-recorded |

**Compliance summary**: 20/20 scenarios accounted for; all in-scope offline invariants passed. Deferred API transition, authorization, cleanup, Storage, and cardinality behavior is not claimed as implemented by this persistence change.

### FK Count and Normative Construct Comparison

Migration #3 contains exactly six new foreign keys:

1. `requests_client_id_fkey`: `requests.client_id` -> `client_profiles.user_id`.
2. `requests_category_id_fkey`: `requests.category_id` -> `categories.id`.
3. `requests_district_id_fkey`: `requests.district_id` -> `districts.id`.
4. `requests_cancelled_by_user_id_fkey`: `requests.cancelled_by_user_id` -> `users.id`.
5. `upload_reservations_request_id_fkey`: `upload_reservations.request_id` -> `requests.id`.
6. `request_images_request_id_fkey`: `request_images.request_id` -> `requests.id`.

The six clauses all use `ON DELETE RESTRICT ON UPDATE CASCADE`; source grep returned six `ON DELETE` entries, six `ON UPDATE` entries, and six `ADD CONSTRAINT ... FOREIGN KEY` entries. No `ON DELETE CASCADE` business path exists.

The normative design comparison passed construct-by-construct:

- Both enum definitions and all enum members match exactly.
- The three tables and every normative column type, nullability, default, mapped physical name, timestamp precision, and status default match.
- All named primary keys, three named request checks, two named reservation checks, three named image checks, and exact predicates match.
- The three unique indexes, three directed/composite indexes, and reserved-only partial expiry index match their frozen names, columns, directions, and predicate.
- All six named foreign keys and their actions match.
- The declarative from-empty diff exited 0 and contained the new enums, tables, fields, defaults, indexes, and six new FKs. The expected differences are Prisma's UUID default representation and the hand-authored same-row checks/partial index, which Prisma does not emit declaratively.
- Migration #3 contains zero `INSERT` statements and zero trigger/function definitions.

### Correctness (Static Evidence)

| Area | Status | Notes |
|---|---|---|
| Request model | Implemented | Exact normative model shape, references, timestamps, status, checks, and indexes are present. |
| Reservation model | Implemented | Minimal locked fields only; no audit timestamp pair or durable expired status. |
| Image model | Implemented | Row existence represents confirmed image; no image status column. |
| Database checks | Implemented | Text, cancellation, reservation state/size, image MIME/size/position, and request publication checks are explicit and named. |
| Referential integrity | Implemented | Six new FKs are restrictive on delete and cascading on update. |
| Offline contracts | Implemented | Both static suites passed and forbidden-literal/no-seed assertions are present. |

### Design Coherence

| Decision | Followed? | Notes |
|---|---|---|
| Closed request and reservation enums | Yes | Request has exactly four states; reservation has the recorded `RESERVED`/`CONFIRMED` choice. |
| Same-row checks without transition triggers | Yes | Checks are present; migration #3 has no transition trigger/function. |
| API-owned transitions and three-image count | Yes | No cross-row count or legal-transition enforcement was added; records assign these to later locked API commands. |
| Restrictive deletion | Yes | All six new FKs are RESTRICT/CASCADE; no soft-delete field was added. |
| Stable per-table object keys | Yes | Named unique keys exist per reservation/image table; no cross-table registry was introduced. |
| Minimal reservation timestamps | Yes | Reservation has only required expiry and nullable confirmation timestamps. |
| Hand-authored migration | Yes | Named checks and partial index are retained explicitly in migration #3. |
| Offline/live boundary | Yes | No PostgreSQL apply, re-apply, status, or seed claim is made. |

### Deviation Scrutiny

- The claimed identity model-count assertion change from 6 to 9 is legitimate: `git diff 40f0dd6^ 40f0dd6 -- apps/api/src/database/identity-schema.spec.ts` shows only that expected count change (one deletion and one addition).
- `git diff 40f0dd6^ 40f0dd6 -- openspec/specs/` is empty. The canonical identity specification was not touched.
- Existing physical schema fields were not changed; the schema diff adds the new enums/models and required reverse relations only.
- The apply record's 455 authored implementation-line count is consistent with the commit contents: 454 additions and 1 deletion across the implementation files, with no compressed or omitted contract evidence.

### Pending-Gate Audit

The following exact pending state was independently found in `apply-progress.md` and `proposal.md`: `UNSATISFIED` / `ALL UNSATISFIED` for migrations #1–#3 apply -> re-apply -> status plus seed execution. No disposable PostgreSQL exists, so migration deployment, re-application, status, and seed were not run. This is the acceptance-required recorded pending state, not a failed offline requirement.

The full-history Prisma diff also remained unavailable because Prisma requires a shadow database URL for a migrations-directory comparison. The verifier did not supply a real database, did not connect to one, and did not convert this limitation into executed-SQL evidence.

### Scope Discipline

- Commit `40f0dd6` is on `main` with subject `chore: add request and image persistence`; the working tree was clean before this report was created.
- Commit inspection shows the intended schema, migration, two request-image contracts, compatibility assertion, and change-root artifacts only. No package manifest, package lock, migration lock, catalog seed, or prior migration was changed.
- `git ls-files` contains no tracked `dist`, `node_modules`, `.next`, TypeScript build-info, or generated output paths.
- Production schema/migration scans found no URL, credential, signed-URL, bucket, or user-path literals. The static contract scans for the same forbidden classes passed.
- `package-lock.json` SHA-256 was unchanged by `npm ci`: `fa844f769d688f55c40ba24d9dcb3ae86fb5ac6885ba33ba3a774ea5014773a2` before and after.
- Final pre-report `git status --porcelain` was empty. The required persisted report is the only expected post-report working-tree artifact and was not committed or used to alter the implementation commit.

### Issues Found

**CRITICAL**: None.  
**WARNING**: The live PostgreSQL migration/seed gate is intentionally pending; npm 12 also emitted environment-level blocked-install-script and audit notices during `npm ci`, and the full-history diff requires an unavailable shadow database. These conditions did not prevent final static suites, validation, type checks, lint, build, or full tests from passing.  
**SUGGESTION**: When disposable PostgreSQL is available, run migrations #1–#3 apply -> re-apply -> status and seed, then replace the recorded pending evidence with executed-SQL evidence.

### Verdict

**PASS**

All 10 requirements and 20 scenarios are covered by passing offline evidence, the normative schema/migration constructs match, all quality gates pass, and the intentionally unavailable live gate is explicitly recorded as pending.

### Archive Notes

The change is ready for `sdd-archive`. Preserve the explicit `UNSATISFIED / RECORDED PENDING` live-gate statement during archival; do not rewrite it as live migration acceptance.
