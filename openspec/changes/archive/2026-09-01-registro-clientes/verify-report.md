```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:20260902-registro-clientes-independent-verification
verdict: pass
blockers: 0
critical_findings: 0
requirements: 10/10
scenarios: 20/20
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:e04957eb0bccc6723761084c077e9f3736d2dc3689a320b252f44fa74ead7bb2
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:d2382f2c5f5744960e82072cd37797b2d78a6bd49974cbfab6e24afac5b4eebf
```

## Verification Report

**Change**: `registro-clientes`
**Acceptance source**: `openspec/changes/registro-clientes/specs/client-onboarding/spec.md`
**Normative design**: `openspec/changes/registro-clientes/design.md`
**Mode**: Standard; `strict_tdd: false`
**Verifier**: Independent `sdd-verify` execution

### Completeness

| Metric | Value |
|---|---:|
| Requirements | 10 |
| Scenarios | 20 |
| Tasks total | 12 assigned task groups |
| Tasks complete | 12 |
| Tasks incomplete | 0 |

All task checkboxes in `tasks.md` are checked. The implementation is committed at `2be0b51 chore: add client onboarding`; the working tree was clean before this report was written.

### Build and test execution

| Command | Exit | Observed result |
|---|---:|---|
| `npm ci` | 0 | 588 packages installed; the existing npm audit reported 3 high-severity advisories and existing install-script warnings. `package-lock.json` SHA-256 remained `4a51033dc8fd79fc86b0868cc46810ddd3a59644a3f76462baf2b6753d5300fd` before and after installation. |
| `npm run prisma:generate --workspace=@repara/api` | 0 | Environment-only regeneration was required after `npm ci` left `.prisma/client` absent; Prisma Client 6.19.3 generated successfully. |
| `npm test --workspace=@repara/api -- --run src/registration` | 0 | 3 files, 26 tests passed. Output SHA-256: `649962389db7ec16c7e47149ba722215b5b9e1c783ab9f0b4bdd1c91cac7246d`. |
| `npm test` | 0 | Final warm rerun: 26 API files and 1 web file passed; 157 API tests and 1 web test passed. Output SHA-256: `e04957eb0bccc6723761084c077e9f3736d2dc3689a320b252f44fa74ead7bb2`. |
| `npm run lint` | 0 | ESLint passed. Existing Next.js pages-directory informational warning only. Output SHA-256: `6d6e948b44643faee85549f76bf10aa0cf42d249a2fda70fe623d42cb789c241`. |
| `npm run format:check` | 0 | All files matched Prettier formatting. Output SHA-256: `ef261df4eaff6009415f2e36036bbef2b330eade83e643af91a2f2318e6ec98f`. |
| `npm run typecheck` | 0 | Web, API, and API client type checks passed. Output SHA-256: `321339b2b7de34ceb249ed2906ca8581394a94ce5d5836a1eb717b42a453f68a`. |
| `npm run build` | 0 | Web, API, and API client builds passed. Existing Prisma 7 configuration deprecation warning only. Output SHA-256: `d2382f2c5f5744960e82072cd37797b2d78a6bd49974cbfab6e24afac5b4eebf`. |
| `npm run contract:check` | 0 | Fresh export, generated-client comparison, OpenAPI validation, and workspace typecheck passed. Output SHA-256: `1feca26e9e4497403397292c92af1513ca18d46180c5d1e2d7ddb8dd1c88d3aa`. |
| `npm run contract:validate` | 0 | OpenAPI document valid. Output SHA-256: `9ea5cd7795430cd23968e6fbb9c4043311c361ba7ec4680f23be4336d5bdaaa6`. |
| `npm run contract:diff` | 0 | No breaking OpenAPI differences detected. Output SHA-256: `9d5191df97729fb2408507733655eb92d0f7ee236260c2e5ed2145bb89baf0b1`. |
| `npm test --workspace=@repara/api -- --run src/registration/registration.integration.spec.ts -t "body-supplied identity"` | 0 | RED trust-boundary check passed: 1 test passed. Output SHA-256: `2a660660b33e9a5125b5b86bcbde9577f36bc2c6d695c8970cc015eafba45129`. |
| `npm test --workspace=@repara/api -- --run src/registration -t "sanitized|secrets|unverified|parameter"` | 0 | RED secret/SQL/auth-boundary check passed: 5 tests passed. Output SHA-256: `660ab70c80cec5fa039abb0bbeb122a968d10fc48c1b5ea115e3f536d2ccd055`. |

The first cold `npm test` invocation exited 1 because `contract-script.spec.ts` hit its 10-second import hook timeout while the suite was cold; it reported 153 passed and 4 skipped. The exact command was rerun independently after warm-up and exited 0 with all 157 API tests plus the web test passing. This is recorded as a verification warning, not a product failure.

Coverage percentage was not configured (`coverage_threshold: 0`); scenario coverage is recorded below from runtime tests.

### Requirement verification table

| Requirement | Commands and source inspected | Observed result | Status |
|---|---|---|---|
| R1 Verified onboarding operation | `npm test --workspace=@repara/api -- --run src/registration`; targeted body-identity test; read `auth.port.ts`, `registration.service.ts`, `registration.module.ts`, `app.module.ts`, `app.factory.ts` | Identity is obtained only from `IdentityPort`; request parsing permits only `name`, `phone`, and `districtId`; unverified identity returns 401 before persistence; `UnavailableIdentityPort` is the production default; no password field is accepted or persisted. | PASS |
| R2 Frozen email normalization | Registration unit suite; read `normalizeEmail` and normalization tests; searched registration source for provider-specific rewriting | Trim plus locale-independent lowercase is applied before reads and writes. No Gmail, dot, plus, or other provider-specific rewriting exists. | PASS |
| R3 Atomic complete domain creation | Registration unit suite; read the single `$transaction` callback and nested profile create; searched service for network calls | One Prisma transaction performs the recheck, district check, and user/profile write; nested profile creation and generic failure mapping passed. No fetch, HTTP, or provider call exists in the service. Live rollback behavior remains pending as required by R10. | PASS; pending-recorded live gate |
| R4 Active district | Registration unit and integration suites; read exact tagged `$queryRaw` | Tagged parameterized SQL filters `active = true` and uses `FOR SHARE` inside the transaction. Inactive district returned 422 with stable `fieldErrors.districtId` and no fake persisted row. | PASS; pending-recorded live lock gate |
| R5 Generic duplicate-email conflict | Registration unit and integration suites; response-detail scans | Different-user pre-read and email-targeted P2002 paths both map to generic 409. Integration responses contain no provider, database, identity, or persistence detail. | PASS |
| R6 Same-subject idempotent reconciliation | Registration unit and integration suites | Same subject returns 200 and the same sanitized projection without a second create; immutable technician role returns 409. | PASS |
| R7 Sanitized projection | Registration unit/integration suites; read response DTO and `project` allowlist | Responses contain only `id`, `role`, and `profile{name, phone, districtId}`. Tests scan for `authSubject`, password, token, and provider text; creation is 201 and reconciliation is 200. | PASS |
| R8 Additive contract publication | `npm run contract:check`, `npm run contract:validate`, `npm run contract:diff`; custom JSON parse; generated-client search; `git diff HEAD^ HEAD` | POST path, request/response schemas, 200/201/400/401/409/422/500 responses, and generated client operation exist. Freshness, validity, and compatibility passed; old-to-new comparison found no removed paths, schemas, or schema properties. | PASS |
| R9 Deferred replaceable provider seam | Read port/module/factory and `auth.port.spec.ts`; `git diff HEAD^ HEAD -- apps/api/src/config/` | Port is explicit and replaceable; fake is explicit in tests/export only; production wiring fails closed. No config files changed and no provider configuration is consumed. Live adapter remains deferred. | PASS; pending-recorded adapter gate |
| R10 Recorded offline evidence limits | Read `apply-progress.md`, `proposal.md`, `design.md`; registration suite and integration suite; searched change artifacts for pending claims | Offline fake identity/persistence mapping and HTTP behavior passed. Live Supabase adapter, live PostgreSQL transaction/rollback/trigger/lock behavior, and BFF flow are explicitly recorded as pending and are not claimed as delivered. | PASS; pending-recorded gates |

### Spec compliance matrix

| Requirement | Scenario | Runtime covering evidence | Result |
|---|---|---|---|
| R1 | Verified request | `registration.service.spec.ts` create test; integration exact 201 test | PASS |
| R1 | Missing or unverified identity | `registration.service.spec.ts` unverified test; integration 401 test | PASS |
| R2 | Normalized email | service normalization/create assertion; integration identity email has whitespace and uppercase | PASS |
| R2 | Provider-specific spelling | service test with `User.Name+tag@Example.COM` | PASS |
| R3 | First creation | service one-transaction/nested-create test; integration create test | PASS |
| R3 | Profile persistence failure | service transaction-boundary failure test maps to safe 500; live rollback is pending | PASS; pending-recorded live gate |
| R4 | Active district | service raw-query test; integration active district create | PASS |
| R4 | Missing or inactive district | service empty district result; integration 422 and no stored user | PASS; pending-recorded live gate |
| R5 | Pre-existing different user | service pre-read conflict; integration generic 409 response scan | PASS |
| R5 | Concurrent duplicate insert | service email-targeted P2002 race mapping; live concurrency remains offline-only | PASS; pending-recorded live gate |
| R6 | Same-subject retry | service no-transaction retry; integration first 201/second 200 sequence | PASS |
| R6 | Immutable role | service and integration technician-role mismatch tests | PASS |
| R7 | Safe creation response | integration exact 201 allowlist and secret scan | PASS |
| R7 | Safe reconciliation response | integration exact 200 allowlist and secret scan | PASS |
| R8 | Contract refresh | contract check/validate/diff and JSON additive comparison | PASS |
| R8 | Unexpected persistence error | integration safe 500 test | PASS |
| R9 | Offline identity seam | `auth.port.spec.ts` fake/unavailable tests; integration injected port | PASS |
| R9 | Deferred live adapter | source wiring and apply/proposal pending-gate records | PASS; pending-recorded |
| R10 | Offline verification | service and HTTP fake-harness suites, 26 registration tests | PASS |
| R10 | Gate honesty | apply-progress and design explicitly mark all live gates pending | PASS; pending-recorded |

**Compliance summary**: 20/20 scenarios have passing offline coverage; live-only evidence is not claimed and is recorded as pending where applicable.

### Design coherence

| Normative decision | Followed? | Evidence |
|---|---|---|
| Registration module beside catalogs | Yes | `RegistrationModule` is composed by `AppModule` without catalog changes. |
| Manual parser with identity-bearing-key rejection | Yes | `parseOnboardRequest` rejects non-object, missing/invalid, and unknown keys before persistence. |
| Explicit replaceable identity port | Yes | `IDENTITY_PORT`, `IdentityPort`, injectable `createApp({ identityPort })`, and unavailable production default. |
| Five-phase service algorithm | Yes | Trusted normalization, verification, subject/email pre-reads, one transaction, and allowlisted projection are present in order. |
| Parameterized active-district row lock | Yes | Tagged `$queryRaw` with district parameter, `active = true`, and `FOR SHARE`. |
| Existing problem filter and safe mapping | Yes | Controller declares problem responses; service maps 401/409/422/500 without exposing internal detail. |
| No schema, environment, client transport, or common error changes | Yes | Commit path inspection and empty config diff confirm the stated boundary. |
| Additive contract regeneration | Yes | OpenAPI/client artifacts are present and automated compatibility checks pass. |

### Pending-gate audit

The following are intentionally **PENDING**, not failures and not satisfied claims:

1. The live Supabase identity adapter, signup/verification, token claims, and provider provisioning gate.
2. PostgreSQL-backed transaction atomicity, rollback, foreign-key/trigger execution, and row-lock behavior.
3. End-to-end web/BFF registration flow and downstream session integration.

Offline fake Prisma and fake identity tests prove orchestration, mapping, transaction intent, and HTTP behavior only. No artifact reviewed claims live provider, live database, or BFF acceptance.

### Scope discipline

The commit contains registration production/test files, the two wiring files, regenerated OpenAPI/client artifacts, and the `registro-clientes` change records. No `apps/web` implementation, BFF, login/session/JWT flow, technician onboarding, Prisma schema, migration, environment/config change, client transport change, or common error-file change entered the slice. Technician ownership remains explicitly outside this client-only change.

### Issues

**CRITICAL**: None.

**WARNING**:

- The first cold full-suite invocation timed out the contract-script import hook; a warm independent rerun of the exact command passed all 157 API tests and the web test.
- npm audit reports 3 high-severity dependency advisories; this is not introduced by the client-onboarding source delta and is outside this change's scope.
- Live provider, PostgreSQL, and BFF gates remain pending by design.

**SUGGESTION**: Consider increasing the contract-script import hook timeout if cold Windows CI runs reproduce the transient timeout.

### Overall verdict

**PASS WITH WARNINGS**

All 10 requirements and 20 scenarios are covered by passing offline evidence, all required quality and contract commands have a final zero exit code, and no critical finding was observed. The warnings are the transient cold-suite timeout, existing dependency advisories, and the explicitly recorded live gates; they do not block archival of this offline change.

### Archive notes

- The canonical verify report is persisted at `openspec/changes/registro-clientes/verify-report.md`.
- Archive only after preserving this report and the pending-gate wording; do not convert pending live gates into satisfied evidence.
- Archive should carry the client-onboarding delta into the main `client-onboarding` spec and preserve the change directory as audit history according to the OpenSpec convention.
- The report itself is newly persisted after the committed apply state, so the final repository status necessarily includes this artifact until the archive work unit records it.
