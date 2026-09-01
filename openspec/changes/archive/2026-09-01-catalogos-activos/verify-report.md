```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:9857fa2b8fe6b7311bfe04dc84528c1f9ed85c729627205745e17bfc57b954c0
verdict: pass
blockers: 0
critical_findings: 0
requirements: 10/10
scenarios: 20/20
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:f491200f09b071c5c305db7abc118f39d0c201471153ef2c4bf600a351a8ae45
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:4c0077da18dd216b37bdbd21e3e21c70b34fb47f67c6cbd5fb5bc930da2b67b2
```

## Verification Report

**Change**: `catalogos-activos`  
**Version**: N/A  
**Mode**: Standard; strict TDD disabled  
**Verification basis**: Independent offline verification. No database connection was made.

### Completeness

| Metric | Value |
|---|---:|
| Requirements retrieved | 10 |
| Scenarios retrieved | 20 |
| Tasks total | 17 |
| Tasks complete | 17 |
| Tasks incomplete | 0 |
| Apply claim | 17/17, commit `3b56623` |

The requirement and scenario totals were counted from `### Requirement:` and `#### Scenario:` headings in `openspec/changes/catalogos-activos/specs/active-catalogs/spec.md`.

### Build and Test Execution

| Command | Exit code | Observed result | Output hash |
|---|---:|---|---|
| `npm test` | 0 | Web: 1 file/1 test passed. API: 15 files/93 tests passed. | `sha256:f491200f09b071c5c305db7abc118f39d0c201471153ef2c4bf600a351a8ae45` |
| `npm run lint` | 0 | ESLint passed. The existing Next pages-directory notice was non-fatal. | `sha256:7c7af65f44fcff070653ace0905d56bd0107883b63d44f7e15cbb151ff0e7066` |
| `npm run format:check` | 0 | All files matched Prettier formatting. | `sha256:bee0edd1dba9ac09a7df20fe732dde5596ec543942380a3ac131445feae359f1` |
| `npm run typecheck` | 0 | Web and API TypeScript checks passed. | `sha256:d9b4193cda90bb247afa512c0f886e631b056f2b28cfd5605b4484b55a87d002` |
| `npm run build` | 0 | Next production build and API TypeScript build passed. | `sha256:4c0077da18dd216b37bdbd21e3e21c70b34fb47f67c6cbd5fb5bc930da2b67b2` |
| `npx prisma validate --schema apps/api/prisma/schema.prisma` | 0 | Existing Prisma schema is valid. | `sha256:0921d7e027353d930e2bcfd74acf84f8d8ab653ddede6c89b72665938ceecca1` |
| `npm run prisma:generate --workspace=@repara/api` | 0 | Prisma Client 6.19.3 generated successfully. | `sha256:0eba00f72382df4a401b24c9f2c03fcc40d6dd18e78c5d42558295753d74b1c4` |
| `npm ci` | 0 | 512 packages installed; `package-lock.json` hash stayed unchanged. npm reported three existing high-severity audit findings. | `sha256:aec7f4a0ce4301912a1eef81d2bc40d7346cb1b859bb55bddcd737e64a1aa155` |

The focused runtime suites were also re-run independently:

| Command | Exit code | Observed result |
|---|---:|---|
| `npm test -- src/database/seeds/catalog-seeder.spec.ts` from `apps/api` | 0 | 1 file/4 tests passed. |
| `npm test -- src/database/seeds/catalog-data.spec.ts` from `apps/api` | 0 | 1 file/5 tests passed. |
| `npm test -- src/catalogs/catalogs.service.spec.ts src/catalogs/catalogs.integration.spec.ts` from `apps/api` | 0 | 2 files/19 tests passed; real Nest/Fastify `inject()` exercised stubbed Prisma delegates. |

The required native-strip smoke command was run with `DIRECT_URL` removed:

```text
node --experimental-strip-types apps/api/prisma/seed.ts
Observed application process exit: 1
Observed application output: Catalog seed failed.
URL/config-detail check: no URL, DIRECT_URL value, or DATABASE_URL value emitted.
```

This proves the native loader reaches the generic configuration failure path offline; it is not database execution evidence.

### Requirement Verification Matrix

| Requirement | Commands / source inspected | Observed result | Result |
|---|---|---|---|
| R1 Transactional seed | `npm test -- src/database/seeds/catalog-seeder.spec.ts`; `Select-String`/source inspection of `catalog-seeder.ts`; native-strip smoke | One `$transaction` contains 4 category and 50 district upserts. Keys are `slug` and `ubigeo`; updates include mutable fields and `active`; no `deleteMany`, `truncate`, or `createMany` call. Fake-client tests passed convergence, ID preservation, rollback propagation, and no destructive cleanup. CLI reads `DIRECT_URL` and constructs a separate client. | **PASS** |
| R2 Locked categories | `npm test -- src/database/seeds/catalog-data.spec.ts`; source inspection of `catalog-data.ts` | Exactly four active pairs passed: `gasfiteria-y-tuberias`, `electricidad-basica`, `reparacion-de-muebles`, and `limpieza-especializada`, with the exact required accented display names. | **PASS** |
| R3 District integrity | `npm test -- src/database/seeds/catalog-data.spec.ts`; independent Node strip-types shape/spot-check command; source inspection | 50 unique active rows passed: 43 Lima rows (`150101`–`150143`) with Lima/Lima fields and 7 Callao rows (`070101`–`070107`) with Callao/Callao fields. Eleven spread spot checks passed, including Ancón, Jesús María, San Martín de Porres, Villa María del Triunfo, Carmen de la Legua, and Mi Perú. Provenance comment is present. | **PASS** |
| R4 Public category reads | Focused service/integration suite | `GET /api/v1/categories` inject checks passed with 200 JSON `{data: [...]}`, exact `{id,slug,name}` projection, active filter, slug/id ordering contract, unauthenticated route, and empty `data`. | **PASS** |
| R5 Public district reads | Focused service/integration suite | `GET /api/v1/districts` inject checks passed with exact `{id,ubigeoCode,name,province,department}` projection, `ubigeo` to `ubigeoCode` mapping, active filter, UBIGEO/id ordering contract, and empty `data`. | **PASS** |
| R6 Active-only policy | Focused service/integration suite; `catalogs.service.ts` inspection | Both services query `where: { active: true }`. Omitted/`true` succeeds; `false` returns 422; malformed values return 400 before the delegate is called. | **PASS** |
| R7 Bounded complete lists | Catalog source search for pagination terms; focused service/integration suite | No pagination parameters or pagination logic exist in catalog production files. Both queries use natural-key ascending order followed by identifier ascending tie-break. | **PASS** |
| R8 Safe catalog failures | Focused service/integration suite; `catalogReadException` and global problem-filter inspection | Stubbed Prisma dependency failure returns sanitized 503 `application/problem+json` with `DEPENDENCY_UNAVAILABLE`; unexpected failure maps to safe 500. SQL, URL, Prisma, and internal error details are omitted. | **PASS** |
| R9 Schema stability | `git diff 3b56623^ 3b56623 -- apps/api/prisma/schema.prisma apps/api/prisma/migrations`; Prisma validate/generate | The requested commit diff was `EMPTY`. Prisma validate and generate both exited 0. | **PASS** |
| R10 Seed acceptance limits | Change-artifact pending-gate audit; native-strip smoke; no-claim search | Offline evidence is explicitly labeled static/offline. Migration apply/re-apply/status, real seed counts, and real idempotent re-seed remain recorded `UNSATISFIED`/`PENDING`; no unqualified live-success claim was found. | **pending-recorded** |

### Scenario Compliance Matrix

The 20 scenarios are accepted under the requested offline policy. The final live-gate scenario is recorded pending rather than treated as a failure or live proof.

| Requirement | Scenario | Covering evidence | Result |
|---|---|---|---|
| R1 | Convergence | `catalog-seeder.spec.ts` — one-transaction key-upsert and second-run convergence tests | ✅ COMPLIANT (offline) |
| R1 | Rollback | `catalog-seeder.spec.ts` — rejected transaction propagates and no counts return | ✅ COMPLIANT (offline) |
| R2 | Locked shape | `catalog-data.spec.ts` — exact four pairs | ✅ COMPLIANT |
| R2 | Unversioned drift | `catalog-data.spec.ts` — exact committed locked array assertion | ✅ COMPLIANT (offline shape guard) |
| R3 | Locked boundary | `catalog-data.spec.ts` — 50 rows, unique codes, ranges, and regions | ✅ COMPLIANT |
| R3 | Correction | `catalog-seeder.spec.ts` — corrected fields and IDs converge on re-run | ✅ COMPLIANT (offline) |
| R4 | Category list | `catalogs.integration.spec.ts` — exact category envelope and query contract | ✅ COMPLIANT (inject) |
| R4 | Empty categories | `catalogs.integration.spec.ts` — 200 with `{data: []}` | ✅ COMPLIANT (inject) |
| R5 | District list | `catalogs.integration.spec.ts` — exact district envelope and mapping | ✅ COMPLIANT (inject) |
| R5 | Empty districts | `catalogs.integration.spec.ts` — 200 with empty data and no extras | ✅ COMPLIANT (inject) |
| R6 | Active selection | Service and integration tests — omitted/true and `active: true` query | ✅ COMPLIANT (offline/inject) |
| R6 | Invalid selection | `catalogs.integration.spec.ts` — false→422 and malformed→400 | ✅ COMPLIANT (inject) |
| R7 | Complete list | Service query contract and inject list responses | ✅ COMPLIANT (offline/inject) |
| R7 | Tie order | Service assertion of natural-key ASC then ID ASC | ✅ COMPLIANT (query contract) |
| R8 | Normal read | Inject 200 responses for both routes | ✅ COMPLIANT (inject) |
| R8 | Sanitized failure | Service 503/500 tests and inject 503 problem response | ✅ COMPLIANT (offline/inject) |
| R9 | Existing schema | Empty commit diff plus validate/generate | ✅ COMPLIANT (static/tooling) |
| R9 | Schema expansion | Empty scoped commit diff and no migration files in the commit | ✅ COMPLIANT (static) |
| R10 | Offline evidence | Full and focused suites executed without a database and labeled offline | ✅ COMPLIANT (offline) |
| R10 | Pending live gate | `apply-progress.md`, proposal, design, and spec retain explicit pending/unsatisfied wording | ⚠️ pending-recorded |

**Compliance summary**: 20/20 scenarios accepted for this offline verification; 19 have passing offline/runtime evidence and 1 is intentionally pending-recorded as required by the acceptance limits.

### Dataset Fidelity Result

The committed `catalog-data.ts` passed the independent shape check and the project data suite: four categories, 50 districts, 43 Lima codes, 7 Callao codes, 50 unique six-digit codes, all active, exact province/department grouping, and 11 requested spread spot checks. The test suite also asserts all 43 committed Lima names and all seven Callao names, including every accented name requested by the verification plan.

There is an evidence-source limitation: the retrieved `design.md` does not contain a literal authoritative 50-row table. It contains the first row, the last row, and a placeholder stating that the omitted rows are “exactly as supplied” (line 35). Therefore a literal independent comparison of every committed row against text physically present in `design.md` was not possible. This is recorded as a warning about design-artifact completeness, not as an observed seed-data mismatch; the explicit specification and committed-data assertions passed.

### Pending-Gate Audit

- No PostgreSQL instance was configured or contacted.
- Migration #1/#2 apply, re-apply, and status verification remain `UNSATISFIED`.
- Real `prisma db seed` execution with observed database row counts remains `UNSATISFIED`.
- Real idempotent re-seed with observed unchanged IDs and converged counts remains `UNSATISFIED`.
- The artifact scan found 25 pending/no-live markers. One raw `seeded` word match occurred in an explicitly fake-client explanation; the filtered audit found zero unqualified live-success claims.
- The native-strip command failed cleanly with exit 1 because `DIRECT_URL` was absent. This is loader/configuration evidence only, not seed success.

### Scope Discipline and Repository State

- `git show --format= --name-status 3b56623` contains the expected seed, catalog API, tests, package configuration, and change artifacts only.
- `git diff 3b56623^ 3b56623 -- apps/api/prisma/schema.prisma apps/api/prisma/migrations` was `EMPTY`.
- The production URL-literal scan over `seed.ts`, `src/database/seeds`, `src/catalogs`, `app.module.ts`, and `apps/api/package.json` was empty.
- The tracked-generated scan was empty: no tracked `node_modules`, `.prisma`, or `dist` paths.
- `npm ci` exited 0 and `package-lock.json` remained `sha256:fa844f769d688f55c40ba24d9dcb3ae86fb5ac6885ba33ba3a774ea5014773a2` before and after installation.
- Before this required report was persisted, `git status --porcelain` and `git diff` were empty. The report itself is the only expected new verification artifact and cannot be committed by this verifier.

### Validation and Persistence

`gentle-ai` CLI availability was checked independently and returned `UNAVAILABLE`. Per the declared OpenSpec file-store mode and the supplied environment contract, no external validator was demanded; the report was persisted directly as the required file artifact. A local envelope check confirmed the first non-empty line is ```` ```yaml ```` and that each required YAML field occurs exactly once.

### Correctness and Design Coherence

| Area | Assessment | Evidence |
|---|---|---|
| Transaction boundary | Followed | One transaction callback and fake-client transaction count. |
| Persistence keys and updates | Followed | `slug`/`ubigeo` upserts; mutable fields and `active` in updates; IDs omitted from updates. |
| CLI/runtime connection separation | Followed | CLI reads `DIRECT_URL`; runtime service remains unchanged and uses its existing configuration. |
| Public read contract | Followed | Dedicated module, global prefix, exact projections, active filter, stable ordering, `{data}` envelope. |
| Failure policy | Followed | Known dependency errors become message-free 503; unexpected failures become safe 500; global filter emits problem JSON. |
| Schema stability | Followed | No schema or migration changes in commit; validate/generate passed. |
| Design dataset source | Partial evidence | The implementation data passed explicit shape and test checks, but the design artifact omits the full literal table needed for a literal row-by-row comparison. |

### Issues Found

**CRITICAL**: None.  
**WARNING**:

1. `design.md` claims an authoritative supplied dataset but physically contains a three-row sketch and an omission placeholder, so a complete text-to-seed row-by-row comparison cannot be independently reproduced from that artifact alone.
2. Live PostgreSQL migration and seed gates are intentionally pending and must remain so in archive and downstream acceptance records.
3. `npm ci` reported three high-severity audit findings in the unchanged dependency lock; no dependency or lockfile change is attributable to this change.

**SUGGESTION**: Preserve the exact authoritative 50-row input in a future design revision before any catalog correction or provenance upgrade.

### Verdict

**PASS WITH WARNINGS**

All ten requirements have passing offline implementation evidence, all 20 scenarios are accounted for under the prescribed pending-live-gate policy, and all requested quality commands exited 0. The warnings are limited to the incomplete literal dataset source in `design.md`, the explicitly unsatisfied real-database gates, and pre-existing dependency audit output.

### Archive Notes

The change is suitable for `sdd-archive` with the pending live gates carried forward verbatim. Archive must not convert static, fake-client, inject, or native-strip failure evidence into a claim of real PostgreSQL migration or seed execution.
