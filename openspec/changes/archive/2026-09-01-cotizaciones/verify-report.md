```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:0b4709d5a08069f989b198e52f64e9dc917008178a5e8b7ecddb998dfcc3a7f1
verdict: pass
blockers: 0
critical_findings: 0
requirements: 10/10
scenarios: 20/20
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:628b0c82d3f4e223634ebb0d9629fc7c332b312eece4a52f64879cd53d06de22
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:b4b15f780bd7f397e7a677b7658f8bd8bb97ccbf41f9a96e54d2eb7ad1f2ce6f
```

## Verification Report

**Change**: `cotizaciones`  
**Acceptance source**: `openspec/changes/cotizaciones/specs/quote-persistence/spec.md`  
**Counted scope**: 10 requirements and 20 scenarios  
**Mode**: Standard (`strict_tdd: false`)  
**Artifact store**: OpenSpec file-based persistence  
**Revision under verification**: `f35ba61 chore: add quote persistence` on `main`

### Completeness

| Metric | Observed |
|---|---:|
| Tasks total | 14 |
| Tasks complete | 14 |
| Tasks incomplete | 0 |
| Requirements assessed | 10/10 |
| Scenarios assessed | 20/20 |

### Build and tests execution

| Command | Exit | Observed result |
|---|---:|---|
| `npm exec --workspace=@repara/api -- vitest run src/database/quote-schema.spec.ts src/database/quote-migration.spec.ts` | 0 | 2 files passed, 10 tests passed; all assertions are labeled `STATIC`. Output hash: `sha256:e636e12ed8186f7b2af171fa6a0058f3a3c26799d084f406ffbf3423cb0f398f`. |
| `npm test` | 0 | Web: 1 file and 1 test passed. API: 19 files and 114 tests passed. Output hash: `sha256:628b0c82d3f4e223634ebb0d9629fc7c332b312eece4a52f64879cd53d06de22`. |
| `npm --prefix apps/api exec prisma validate -- --schema prisma/schema.prisma` from repository root | 1 | Failed because the schema path is resolved from the repository root. This is the documented apply deviation, not an implementation failure. |
| `npm exec prisma validate -- --schema prisma/schema.prisma` from `apps/api` with invocation-only dummy `DIRECT_URL` | 0 | Prisma schema is valid. Output hash: `sha256:235bdf95c437a26c16fefdc9f0a200d2a135d89efd149173af7fec2d9168b928`. |
| `npm exec prisma generate -- --schema prisma/schema.prisma` from `apps/api` with invocation-only dummy `DIRECT_URL` | 0 | Prisma Client 6.19.3 generated; generated output is ignored and not part of the source tree. |
| `npm exec prisma migrate diff -- --from-empty --to-schema-datamodel prisma/schema.prisma --script` from `apps/api` with invocation-only dummy `DIRECT_URL` | 0 | From-empty declarative diff emitted the complete ten-model schema, quote enum/table, quote indexes, and quote foreign keys. Output hash: `sha256:1139eb60598e798abaa1e4e18f8fa9845b24dcd2d309448e7e45d97b592d8b32`. |
| `npm run format:check` | 0 | All files matched Prettier formatting. |
| `npm run lint` | 0 | Web and API lint passed; the existing Next pages-directory warning was non-failing. |
| `npm run typecheck` | 0 | Web and API TypeScript checks passed. |
| `npm run build` | 0 | Next production build and API TypeScript build passed. Output hash: `sha256:b4b15f780bd7f397e7a677b7658f8bd8bb97ccbf41f9a96e54d2eb7ad1f2ce6f`. |
| `npm ci` | 0 | 512 packages added and 517 audited; `package-lock.json` SHA-256 remained `fa844f769d688f55c40ba24d9dcb3ae86fb5ac6885ba33ba3a774ea5014773a2` before and after. npm reported existing audit/deprecation/install-script warnings. |

**Coverage**: Not configured; threshold is 0. The acceptance contract is static and offline for this change, so no coverage claim is made.

### Per-requirement verification matrix

| Requirement | Commands / inspection | Observed result | Status |
|---|---|---|---|
| R1 Complete quote aggregate | Focused quote suites; `schema.prisma` Quote block; migration #4 table/FK definitions | Quote has required UUID references, amount, currency, description, availability, status, and timestamps. `request_id` references `requests.id`; `technician_id` references `technician_profiles.user_id`, not `users.id`; both are required. | PASS — STATIC |
| R2 Fixed PEN money | Focused quote suites; schema and migration amount/currency declarations; persistence-path money search | `Decimal @db.Decimal(8, 2)` maps to `NUMERIC(8,2) NOT NULL`; exact amount bound and `PEN` check are present. No Float or numeric money representation exists in the quote persistence path. | PASS — STATIC |
| R3 Bounded description | Focused quote suites; migration #4 check inspection | `VARCHAR(1000) NOT NULL` and exact `char_length(trim("description")) BETWEEN 10 AND 1000` predicate are present. | PASS — STATIC |
| R4 Closed lifecycle | Focused quote suites; enum/table inspection; migration #4 trigger/function search | `QuoteStatus` has exactly `SUBMITTED`, `WITHDRAWN`, `SELECTED`, and `CLOSED`; table default is `SUBMITTED`; migration #4 contains no `CREATE FUNCTION` or `CREATE TRIGGER`. Transition legality remains outside persistence. | PASS — STATIC |
| R5 Unique quote pair | Focused quote suites; migration unique-index inspection | Exactly one named pair unique exists: `quotes_request_id_technician_id_key` on `(request_id, technician_id)`. No second pair constraint is present. | PASS — STATIC |
| R6 UTC availability | Focused quote suites; migration clock-predicate inspection | `available_at TIMESTAMPTZ(6) NOT NULL` is present. The only `CURRENT_TIMESTAMP` in migration #4 is the `created_at` default; no clock-based check exists. | PASS — STATIC |
| R7 Deterministic read paths | Focused quote suites; migration index inspection | Both named indexes are present with `(created_at DESC, id ASC)` tie-breaking: `idx_quotes_technician_created` and `idx_quotes_request_created`. | PASS — STATIC |
| R8 Restrictive referential integrity | Focused quote suites; migration FK inspection; `deletedAt` search | Migration #4 has exactly two new foreign keys. Both use `ON DELETE RESTRICT ON UPDATE CASCADE`; targets are `requests.id` and `technician_profiles.user_id`; Quote has no `deletedAt` field. | PASS — STATIC |
| R9 Fourth migration contract | Migration directory inspection; `npm exec prisma validate ...`; `npm exec prisma migrate diff ...`; `git diff --exit-code f35ba61^ f35ba61 -- openspec/specs/` | Order is baseline, identity profiles, requests/images, quotes. Migration #4 is named `20260901000002_quotes`; validation and diff exit 0; canonical specs and migration lock are unchanged. The live gate wording is present and recorded pending. | PASS; live gate PENDING-RECORDED |
| R10 Offline static contracts | Exact focused quote command; full `npm test`; identity/request-image spec inspection | Quote suites pass 10/10 and explicitly label evidence `STATIC`; both compatibility model-count assertions are 10; full workspace is green at web 1 test plus API 114 tests. No static result claims SQL execution or concurrency proof. | PASS — STATIC |

### Scenario compliance matrix

All offline rows below are supported by the passing static contract suites. `PENDING-RECORDED` is the explicitly accepted result for the unavailable live-gate scenario and is not SQL or concurrency evidence.

| Requirement | Scenario | Covering evidence | Result |
|---|---|---|---|
| R1 | Persist complete quote | Quote fields, mappings, and relation assertions | COMPLIANT — STATIC |
| R1 | Reject missing parent | Required restrictive FK assertions | COMPLIANT — STATIC |
| R2 | Store valid money | Decimal/scale/type and currency assertions | COMPLIANT — STATIC |
| R2 | Reject invalid money | Exact amount bound and PEN check assertions | COMPLIANT — STATIC |
| R3 | Store bounded description | VarChar(1000) and description check assertions | COMPLIANT — STATIC |
| R3 | Reject invalid description | Trimmed 10–1000 check assertion | COMPLIANT — STATIC |
| R4 | Initialize submitted status | Enum and default assertions | COMPLIANT — STATIC |
| R4 | Reject unknown or unevaluated transition | Closed enum and no-trigger scope assertions | COMPLIANT — STATIC; transition legality API-owned |
| R5 | Update on resend | Pair identity remains uniquely constrained | COMPLIANT — STATIC; update behavior downstream |
| R5 | Reject duplicate pair | Named unique-index assertion | COMPLIANT — STATIC |
| R6 | Persist availability | Required `TIMESTAMPTZ(6)` assertion | COMPLIANT — STATIC |
| R6 | Do not enforce future time | No clock-based check inspection | COMPLIANT — STATIC |
| R7 | Read both ordered lists | Two directed read-index assertions | COMPLIANT — STATIC |
| R7 | Resolve equal timestamps | Descending creation plus ascending identifier indexes | COMPLIANT — STATIC |
| R8 | Preserve linked quote | Restrictive relation/FK assertions | COMPLIANT — STATIC |
| R8 | Reject parent deletion | Two `RESTRICT` FK assertions | COMPLIANT — STATIC |
| R9 | Identify migration four | Directory/name/DDL inspection and Prisma checks | COMPLIANT — STATIC |
| R9 | Preserve pending live gate | `apply-progress.md` and proposal pending-gate records | PENDING-RECORDED — expected |
| R10 | Verify offline invariants | 10 passing static tests | COMPLIANT — STATIC |
| R10 | Limit static evidence | Test labels and report wording | COMPLIANT — STATIC |

**Scenario summary**: 19 scenarios have passing static coverage; the one live-gate scenario is correctly recorded pending under the acceptance source; all 20 scenarios were assessed without claiming unavailable runtime proof.

### Normative construct comparison

| Design construct | `schema.prisma` observed | Migration #4 observed | Comparison |
|---|---|---|---|
| Enum | Four exact `QuoteStatus` members | Exact four-value PostgreSQL enum | Match |
| Aggregate and key | UUID `Quote` with named `quotes_pkey`; required mapped fields | UUID table with named primary key | Match |
| Money/currency | `Decimal @db.Decimal(8, 2)` and `String @db.VarChar(3)` | `NUMERIC(8,2)` and `VARCHAR(3)` | Match |
| Description/time | `VarChar(1000)` and required `Timestamptz(6)` availability | `VARCHAR(1000)` and `TIMESTAMPTZ(6)` availability | Match |
| Checks | Checks are not representable in the Prisma datamodel | Exact named amount, currency, and trimmed-description checks | Match to hand-authored authoritative SQL |
| Lifecycle | `@default(SUBMITTED)` and no transition declarations | `DEFAULT 'SUBMITTED'`, no function or trigger | Match |
| Pair uniqueness | Named `@@unique([requestId, technicianId])` | Named unique index on the same pair | Match; one pair constraint |
| Read indexes | Two named indexes with descending creation time and identifier tie-break | Two named indexes with explicit ASC/DESC directions | Match |
| Foreign keys | Request `id` and TechnicianProfile `userId`, `Restrict` | Requests `id` and technician profiles `user_id`, `RESTRICT/CASCADE` | Match |
| Seed/trust boundary | No seed or runtime behavior added | Zero `INSERT INTO`, no trigger/function | Match |

The from-empty diff also showed the known tolerated differences: Prisma emitted `DECIMAL` rather than SQL `NUMERIC`, omitted the server-side UUID default represented by Prisma `@default(uuid())`, omitted default `ASC` terms, and emitted indexes in a different order. Names and declarative definitions remained aligned; Prisma cannot emit the three hand-authored checks from the datamodel.

### Design coherence

| Decision | Result | Evidence |
|---|---|---|
| PostgreSQL/Prisma enum with default and no triggers | Followed | Exact enum/default; migration #4 has no function or trigger. |
| Fixed precision PEN boundary | Followed | Decimal(8,2), VARCHAR(3), exact PEN check, and amount bound. |
| Trimmed description and required availability | Followed | Exact physical bounds and `TIMESTAMPTZ(6)` declaration. |
| Deterministic reads and append-only migration history | Followed | Two directed indexes; migration #4 follows the existing history and lock. |
| API-owned transitions and future validation | Followed | No endpoint, command, transition trigger, or clock check was added. |

### Deviation scrutiny

The documented Prisma CLI path deviation is reproducible: the root invocation with `--prefix apps/api` and a repository-relative schema path exits 1 because `prisma\schema.prisma` is not found from the repository root. The equivalent invocation from `apps/api` exits 0, as do generate and migrate diff. This is a command-working-directory issue only; no source or design deviation is present.

The apply record's 245-line implementation count is consistent with the changed schema, migration, two new suites, and two one-line count updates. The single commit subject, branch, and parent history match the supplied context.

### Pending-gate audit

`apply-progress.md` explicitly records **UNSATISFIED / RECORDED PENDING** for migrations #1–#4 apply, re-apply, status, and seed execution because no disposable PostgreSQL instance exists. It also records unique-index race/concurrency proof as live-only. Quote transition legality and availability revalidation are correctly identified as API-owned follow-on work. No live command was run and no real database was contacted.

### Scope discipline and repository state

- `git diff --exit-code f35ba61^ f35ba61 -- openspec/specs/` exited 0; prior canonical specs are untouched.
- `migration_lock.toml` and migrations #1–#3 are unchanged.
- Changed production files contain no URL or credential literals; `DIRECT_URL` is only the pre-existing Prisma environment reference, and the dummy value was invocation-only.
- Generated Prisma output remains ignored; no generated source was added to the commit.
- Before this required report was persisted, `git status --porcelain` was empty. After persistence, the only expected working-tree entry is the new OpenSpec artifact `openspec/changes/cotizaciones/verify-report.md`; no implementation mutation is present.

### Issues found

**CRITICAL**: None.

**WARNING**:

1. The disposable-PostgreSQL apply/re-apply/status/seed and concurrency gates remain pending by explicit acceptance, so this report is offline/static verification rather than live database proof.
2. `npm ci` reported three high-severity audit findings, a deprecated ESLint version notice, and blocked package install scripts; all requested validation, test, lint, typecheck, format, and build commands still exited 0.

**SUGGESTION**:

1. Run the recorded live gate when a disposable PostgreSQL instance is available.
2. Review the dependency audit and npm install-script policy separately from this schema change.

### Overall verdict

**PASS** — all 10 requirements and 20 scenarios were assessed; offline static evidence and quality gates pass, while the explicitly unavailable live gate is preserved as `UNSATISFIED / RECORDED PENDING`.

### Archive notes

The change is ready for `sdd-archive`. Preserve migration `20260901000002_quotes`, merge the quote-persistence delta into the canonical specs during archive, and retain the pending live-gate record in the archive audit trail. No focused remediation is required for this change.
