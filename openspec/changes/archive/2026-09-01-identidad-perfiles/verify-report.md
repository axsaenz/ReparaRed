```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:f0949b34814d7bb305540f887771908b23b8249f08b471cb87b07f082ceb7bfb
verdict: pass
blockers: 0
critical_findings: 0
requirements: 9/9
scenarios: 18/18
test_command: "npm test"
test_exit_code: 0
test_output_hash: sha256:8373cccb8c40342e8482a7bc0b39a5c3fea3301e7d08603137ba5e76ffc48182
build_command: "npm run build"
build_exit_code: 0
build_output_hash: sha256:8a44897f930da54ae9b4099dea8487cbb3a8c1f0c86be0b2fbbda69d1ad9f907
```

## Verification Report

**Change**: `identidad-perfiles`  
**Mode**: Standard offline verification  
**Acceptance source**: `specs/identity-persistence/spec.md` (9 requirements, 18 scenarios), with the `api-foundation` delta checked for baseline clarification.

### Completeness

| Metric | Observed |
|---|---:|
| Tasks total | 11 |
| Tasks complete | 11 |
| Tasks incomplete | 0 |
| Authored implementation change size | 1,268 lines, recorded as `size:exception` |

All tasks in `tasks.md` are checked. No full-suite prerequisite was incomplete.

### Build and Test Execution

| Command | Exit | Observed result |
|---|---:|---|
| `npm ci` | 0 | Dependencies installed; npm reported existing audit noise (3 high-severity advisories) and blocked install scripts in this environment. The lockfile SHA-256 remained `FA844F769D688F55C40BA24D9DCB3AE86FB5AC6885BA33BA3A774EA5014773A2`. |
| `npm exec --workspace=@repara/api -- prisma generate --schema prisma/schema.prisma` with invocation-only `DIRECT_URL` | 0 | Prisma Client 6.19.3 generated; output remained ignored and untracked. |
| `npm exec --workspace=@repara/api -- prisma validate --schema prisma/schema.prisma` with invocation-only `DIRECT_URL` | 0 | Schema valid. Output hash: `sha256:35fe6f16270ea0a14ec2f2f957d13136db0be55d5a6b347d9901d46733cf9bb8`. |
| `npm exec --workspace=@repara/api -- vitest run src/database/identity-schema.spec.ts src/database/identity-migration.spec.ts` | 0 | 2 files passed, 11 tests passed. Output hash: `sha256:1c4ff9949b32666b83bf6a37b0be97334e5a48c27745bc6d0a5088050a75d081`. |
| `npm test` | 0 | Web: 1 file/1 test passed. API: 11 files/65 tests passed. Output hash: `sha256:8373cccb8c40342e8482a7bc0b39a5c3fea3301e7d08603137ba5e76ffc48182`. |
| `npm run lint` | 0 | Web and API lint passed; the existing Next.js pages-directory warning was emitted. Output hash: `sha256:977e86442471ec5cf21df9feb1151d5333268e8018b3d789814dc16d63792e4c`. |
| `npm run format:check` | 0 | All files matched Prettier style. Output hash: `sha256:889f8794f7473e71a82f9a626028d470c990d8309969200e5e5d40edcec4dda1`. |
| `npm run typecheck` | 0 | Web and API type checks passed. Output hash: `sha256:09a8581ad3fd5126d5ce6992fe6a0f11a2fc2f8dd3e0da6a0005cd4a121a7ed0`. |
| `npm run build` | 0 | Web production build and API TypeScript build passed. Output hash: `sha256:8a44897f930da54ae9b4099dea8487cbb3a8c1f0c86be0b2fbbda69d1ad9f907`. |

Coverage was not configured for this workspace; no threshold was specified.

### Requirement Verification Matrix

| Requirement | Commands / source checked | Observed result | Verdict |
|---|---|---|---|
| R1 Domain identity records | Read `apps/api/prisma/schema.prisma`; credential-token scan; static schema suite | `User` has UUID primary key, unique `auth_subject`, unique email, `UserRole`, UTC-capable `TIMESTAMPTZ(6)` timestamps, and `@@map("users")`. No password, hash, secret, or credential field/token was found in the schema. | PASS |
| R2 Role immutability | Static migration suite; migration text scan for function, trigger, condition, and raise | `prevent_user_role_change()` is attached to `users_role_immutable` as `BEFORE UPDATE OF "role"`; the function compares `NEW` and `OLD` roles and raises `User role is immutable`. This is static SQL evidence, not executed-PostgreSQL evidence. | PASS |
| R3 Client profile integrity | Read schema; static migration suite; named-check/FK/role-trigger scan | `ClientProfile` uses user ID as its UUID primary key, bounded name/phone fields, district UUID FK, 2–100 trimmed-name check, E.164 check, restrictive user/district FKs, and `client_profiles_role_match`. | PASS |
| R4 Technician profile integrity | Read schema; static migration suite; named-check/FK/role-trigger scan | `TechnicianProfile` uses user ID as its UUID primary key, bounded professional name/description/phone, `SMALLINT` years field, 2–100 name check, 20–1000 description check, 0–80 years check, restrictive user FK, and `technician_profiles_role_match`. | PASS |
| R5 Specialty uniqueness | Read schema; static migration suite; cross-row-rule scan | Composite primary key is `(technician_id, category_id)`, both FKs are restrictive, `created_at` is `TIMESTAMPTZ(6)`, and `idx_specialties_by_category` is category-first. No `COUNT`, `EXISTS`, or row-level “at least one” rule exists in the schema or migration. | PASS |
| R6 Catalog prerequisites | Read schema/migration; zero-INSERT scan; committed scope scan | `categories` and `districts` exist with the required IDs, unique slug/UBIGEO fields, names, district province/department, and active defaults. Migration contains zero `INSERT INTO` lines. No seed or catalog-read file is in the implementation commit. | PASS |
| R7 Referential integrity policy | Independent FK/action count; deleted-column scan; static migration suite | Migration has exactly 5 FK lines and exactly 5 `ON DELETE RESTRICT` lines; `ON DELETE CASCADE` count is 0 and `deleted_at` count is 0. | PASS |
| R8 Versioned migration contract | Migration directory order; baseline/lock read and diff; Prisma validate; migrate diff; pending-gate audit | Order is `00000000000000_baseline` then `20260901000000_identity_profiles`; lock provider is PostgreSQL; baseline and lock were unchanged by the implementation commit; validation and diff exited 0. The live apply/re-apply/status gate is recorded `UNSATISFIED`/pending, and no artifact claims successful live execution. | PASS / pending-recorded |
| R9 Offline persistence contracts | Two static suites; STATIC-label scan; full workspace test and quality gates | Static schema/migration suites passed 11/11, every assertion is labeled `STATIC`, and the full workspace passed web 1/1 plus API 65/65. | PASS |

### Scenario Compliance

The following matrix covers all 18 scenarios from the acceptance source. “STATIC” means the assertion ran offline against schema or migration text; it does not claim database execution.

| Requirement | Scenario | Covering evidence | Result |
|---|---|---|---|
| R1 | Happy | `identity-schema.spec.ts` identity model/field assertions passed | COMPLIANT (STATIC) |
| R1 | Edge | `identity-schema.spec.ts` uniqueness and forbidden-column assertions passed | COMPLIANT (STATIC) |
| R2 | Happy | Enum and role-field assertions passed | COMPLIANT (STATIC) |
| R2 | Edge | Trigger/function text assertion plus independent `RAISE EXCEPTION` inspection passed | COMPLIANT (STATIC) |
| R3 | Happy | Client model, bounds, relation, and named-check assertions passed | COMPLIANT (STATIC) |
| R3 | Edge | Primary key, FK, checks, and role-match trigger assertions passed | COMPLIANT (STATIC) |
| R4 | Happy | Technician model, bounds, relation, and named-check assertions passed | COMPLIANT (STATIC) |
| R4 | Edge | Primary key, FK, checks, and role-match trigger assertions passed | COMPLIANT (STATIC) |
| R5 | Happy | Composite-key, timestamp, FK, and reverse-index assertions passed | COMPLIANT (STATIC) |
| R5 | Edge | Composite uniqueness and reference assertions passed; cross-row rule remains intentionally deferred | COMPLIANT (STATIC) |
| R6 | Happy | Catalog table/field/default assertions and empty migration scan passed | COMPLIANT (STATIC) |
| R6 | Edge | Scope scan found no seed or read implementation | COMPLIANT (STATIC) |
| R7 | Happy | Five restrictive FK declarations were independently counted and inspected | COMPLIANT (STATIC) |
| R7 | Edge | Zero cascade actions and zero `deleted_at` columns were independently observed | COMPLIANT (STATIC) |
| R8 | Happy | Baseline ordering, named constructs, validation, and migrate diff passed | COMPLIANT (STATIC) |
| R8 | Edge | No disposable PostgreSQL instance is available; the live gate is recorded `UNSATISFIED` and not claimed passed | PENDING-RECORDED |
| R9 | Happy | Both STATIC suites passed 11/11 | COMPLIANT (STATIC) |
| R9 | Edge | Artifacts and test labels explicitly avoid executed-SQL claims | COMPLIANT (STATIC) |

**Offline scenario summary**: 18/18 scenarios assessed; 17 have passing STATIC evidence and the one live-gate scenario is correctly `PENDING-RECORDED` under the acceptance contract.

### FK and Seed-Insert Audit

- FK count: **5** — client profile user, client profile district, technician profile user, specialty technician, specialty category.
- `ON DELETE RESTRICT`: **5**.
- `ON DELETE CASCADE`: **0**.
- `INSERT INTO` in migration #2: **0**.
- `deleted_at` columns in schema/migration: **0**.
- Cross-row “at least one” constraint markers (`COUNT`, `EXISTS`, or equivalent): **0** in schema/migration.

### Migration Diff Comparison

The exact command `npm exec --workspace=@repara/api -- prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma` exited 0. Its observed summary contained the public schema, `UserRole`, all six tables, all unique indexes, the category-first specialty index, and all five foreign keys.

The script form also exited 0 and was compared with migration #2. The declarative portions agree on table names, physical snake_case fields, types, primary keys, unique indexes, reverse specialty index, and restrictive/cascading FK actions. Accepted differences are: Prisma emits `CREATE SCHEMA IF NOT EXISTS "public"`; table/index ordering differs; Prisma’s `uuid()` client default is emitted without the hand-authored `gen_random_uuid()` database default; and Prisma does not emit the hand-written checks or triggers. No unreviewed declarative mismatch was observed.

### Pending-Gate Audit

- `apply-progress.md`, `proposal.md`, `design.md`, and the specs record the live apply → re-apply → status gate as `UNSATISFIED`/pending.
- The change artifacts contain `migrate deploy` references only in statements that say live execution remains pending; no successful live deployment, re-application, status, rollback, or executed-check claim was found.
- No database connection or live SQL execution was attempted. `DIRECT_URL` values were dummy process-environment values only and were not written to files.

### Scope and Integrity Discipline

- The implementation commit is exactly `213a1b2 chore: add identity and profile persistence` on `main`.
- Its 13 files match the intended schema, migration, static tests, and OpenSpec records; no unrelated production file, seed, or catalog-read file was introduced.
- Baseline migration #1 and `migration_lock.toml` were independently confirmed unchanged.
- Generated Prisma/build output is not tracked. Concrete URL and credential literal scans over the changed schema, migration, and static tests returned no matches; the tests’ encoded guard patterns are detection logic, not credentials or URLs.
- `git diff --check HEAD^ HEAD` passed.
- `git status --porcelain` was empty after all verification commands and before this required report artifact was created. The report itself is the only expected new OpenSpec output.

### Design Coherence

| Design decision | Result | Evidence |
|---|---|---|
| Prisma 6.19.3 PostgreSQL schema with mapped snake_case objects | Followed | `schema.prisma` validates and migration matches the declared physical shape. |
| Empty baseline followed by versioned migration #2 | Followed | Directory order and unchanged baseline/lock inspection passed. |
| Hand-authored checks/triggers supplement Prisma DDL | Followed | Named checks and three role-related trigger paths are present; live execution remains pending. |
| Restrictive deletes and deferred cross-row specialty count rule | Followed | Five restrictive FKs, no cascade, and no cross-row count/existence constraint. |
| Empty catalog skeletons without seeds or active behavior | Followed | Categories/districts exist; migration has zero inserts and scope has no seed/read implementation. |

### Issues and Notes

**CRITICAL**: None.  
**WARNING**: Live PostgreSQL execution remains unavailable by contract; the `npm ci` environment reported three high-severity dependency advisories and blocked package install scripts, so Prisma Client generation was rerun explicitly before the passing static suite.  
**SUGGESTION**: Re-run the live migration apply → re-apply → status gate against a disposable PostgreSQL instance before treating R8’s pending gate as satisfied.

### Overall Verdict

**PASS** for the requested offline verification, with the live database gate correctly preserved as `PENDING-RECORDED`/`UNSATISFIED`. The implementation satisfies all nine requirements through independent source inspection and passing offline contract/quality evidence; no live SQL acceptance is claimed.

### Notes for Archive

- Archive is appropriate for the offline-complete change after preserving the pending live-gate note.
- Archive must retain the `api-foundation` clarification that migration #1 is empty and subsequent versioned domain migrations are expected.
- Do not convert the recorded live-gate state to passed without a disposable PostgreSQL run.
