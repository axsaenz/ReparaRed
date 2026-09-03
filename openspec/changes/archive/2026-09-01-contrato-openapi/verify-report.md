```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:7078DB2D4ED8A85D160E229B7BA24FE0043BCF903802DDB59641B92FE2DEB9DD
verdict: pass
blockers: 0
critical_findings: 0
requirements: 10/10
scenarios: 21/21
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:DE0F578FB2B0A7906998A522327C8A6F59B505B17DFFDF8EDE6AED5C8C7791B9
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:1A49BA0A58798097F86715BB57BE1E72ABB5EE6234B8F4461CFA257D50CDEF68
```

# Verification Report

**Change**: `contrato-openapi`
**Acceptance source**: `openspec/changes/contrato-openapi/specs/openapi-contract/spec.md`
**Mode**: Standard (`strict_tdd: false`)
**Artifact store**: OpenSpec file mode
**Commit under verification**: `8b25cf5 chore: automate OpenAPI contract`

## Completeness

| Metric | Observed |
|---|---:|
| Requirements | 10 |
| Scenarios | 21 actual headings |
| Tasks total | 5 phases / 14 leaf tasks |
| Tasks complete | 5/5 phases; all checkboxes complete |
| Tasks incomplete | 0 |

The request context states 20 scenarios, but the retrieved acceptance source contains 21 `#### Scenario:` headings. Verification and the YAML envelope use the authoritative retrieved count.

## Build and test execution

| Command | Exit code | Result / evidence |
|---|---:|---|
| `npm ci` | 0 | Installed 587 packages; lockfile hash unchanged. |
| `npm run prisma:generate --workspace=@repara/api` | 0 | Ran once as environment-only preparation because `.prisma/client` was absent after `npm ci`. |
| `npm test` | 0 | Web: 1 file / 1 test; API: 23 files / 131 tests; all passed. Combined output hash: `sha256:DE0F578FB2B0A7906998A522327C8A6F59B505B17DFFDF8EDE6AED5C8C7791B9`. |
| `npm run lint` | 0 | Passed; Next reported only the existing missing Pages-directory informational warning. |
| `npm run format:check` | 0 | All files matched Prettier style. |
| `npm run typecheck` | 0 | Web, API, and API client passed. |
| `npm exec --workspace=@repara/api-client -- tsc --noEmit` | 0 | Direct generated-client typecheck passed. |
| `npm run build` | 0 | Web, API, and API client builds passed. Combined output hash: `sha256:1A49BA0A58798097F86715BB57BE1E72ABB5EE6234B8F4461CFA257D50CDEF68`. |
| `npm run contract:validate` | 0 | `OpenAPI document is valid.` |

Coverage was not configured; no threshold was declared.

## Per-requirement verification

| Requirement | Commands and observed evidence | Result |
|---|---|---|
| R1 Contract publication | With `DATABASE_URL` unset, two independent `npm run contract:export` runs exited 0 and produced identical hash `sha256:1EC444756160230B8153EADAF2F328A525B9B5D3601B8E7DDEE88527F1C6F96D`; `apps/api/openapi.json` is tracked. | PASS |
| R2 Documented surface completeness | Parsed export contained exactly `/`, `/api/v1/categories`, `/api/v1/districts`, `/health/live`, and `/health/ready`. Catalog response sets were exactly `{200,400,422}`; root and health responses matched their documented designs; no security schemes were present. | PASS |
| R3 Shared contract schemas | `npm run contract:validate` and JSON assertions passed. `ProblemDetailsDto`, both data envelopes, category/district projections, `MoneyDto`, `TimestampDto`, and `PaginationQueryDto` were present with locked fields/examples. Catalog operations had no pagination parameter, and no Prisma name appeared in the document. | PASS |
| R4 Conventions fidelity | JSON assertions confirmed `/api/v1` business paths, camelCase fields, string IDs, `date-time`, and `urn:reparared:error:INPUT_INVALID`. The full runtime suite passed, with no runtime semantic mutation observed. | PASS |
| R5 Offline export discipline | Two DB-free exports passed. The dedicated regression test passed 1/1 and observed no `PrismaService.$connect` call and no listening server. Export closes the application in `finally`. | PASS |
| R6 Generated client | `npm run contract:generate`, direct client typecheck, and root typecheck passed. `packages/api-client/src/generated.ts` and its factory are tracked. Factory accepts caller-supplied base URL, fetch, and headers; no runtime cookie, session, token, or business-rule handling exists. Generated `cookie?: never` declarations are type-shape constraints, not session logic. | PASS |
| R7 Artifact freshness | Clean `npm run contract:check` passed on the CRLF checkout. A real `openapi.json` version mutation caused the public check to exit 1 with `Stale contract artifacts`, and the mutation remained present. `git checkout -- apps/api/openapi.json` restored hash `sha256:F72BE6B53CBF72A7415E19570C097282BAE9134E0C09975FC7B63AD6B76A1321` byte-exactly; the subsequent clean check passed. Focused spec passed 4/4, including CRLF-vs-LF freshness and real-content staleness. | PASS |
| R8 Compatibility detection | `npm run contract:diff` exited 0 and printed the explicit `FIRST-BASELINE skip`. The focused Node-API fixtures passed: removed path classified as breaking and optional property addition classified as non-breaking. | PASS |
| R9 Gate placement and portability | Workflow inspection confirmed Test → Contract gate → Contract compatibility → Build. All five contract commands are Node/npm orchestration without `&&`, `;`, shell variable expansion, or credentials. The Windows local-base defect was removed by using the `openapi-diff` Node API with file-URL fixture locations. | PASS |
| R10 Contract verification limits | Offline validity, determinism, stale detection, typecheck, gate wiring, and build passed locally. The pending live PostgreSQL obligation remains explicitly orthogonal; no remote execution or future endpoint acceptance is claimed. | PASS |

## Behavioral compliance matrix

| Requirement | Scenario | Covering evidence | Result |
|---|---|---|---|
| R1 | Deterministic publication | Two independent DB-free exports; identical SHA-256 hashes. | COMPLIANT |
| R1 | Regeneration drift | Public `contract:check` real-content mutation RED sequence exited 1 and preserved the mutation. | COMPLIANT |
| R2 | Surface documented | Export path-set and exact catalog response-set assertions passed. | COMPLIANT |
| R2 | Undocumented path | Export path-set assertion covered all five reachable routes and found no extra/missing route. | COMPLIANT |
| R3 | Schemas present | Schema presence/shape assertions plus `contract:validate` passed. | COMPLIANT |
| R3 | Persistence leakage | Full-document Prisma-name scan passed clean. | COMPLIANT |
| R4 | Conventions honored | Convention assertions passed for prefixes, casing, IDs, timestamp, and URN. | COMPLIANT |
| R4 | Runtime mutation | Full runtime suite passed; implementation remains metadata/documentation-only for the contract change. | COMPLIANT |
| R5 | Offline export succeeds | DB-free export and in-process no-connect/no-listen regression passed. | COMPLIANT |
| R5 | Eager initialization regression | Regression harness spies on `$connect`, requires no database URL, and protects the export boundary. | COMPLIANT |
| R6 | Client generated and compiles | Generation, direct client typecheck, workspace typecheck, and build passed. | COMPLIANT |
| R6 | Session leakage | Client source inspection found no session/token/cookie handling; only generated `cookie?: never` constraints exist. | COMPLIANT |
| R7 | Fresh artifacts | Clean `contract:check` passed before and after the mutation restoration, including CRLF checkout normalization. | COMPLIANT |
| R7 | Stale artifacts | Version mutation produced exit 1, listed `apps/api/openapi.json`, and was not overwritten. | COMPLIANT |
| R8 | Breaking change detected | Node-API fixture with removed path returned `breakingDifferencesFound: true`. | COMPLIANT |
| R8 | Additive change allowed | Node-API fixture with optional property addition returned `breakingDifferencesFound: false`. | COMPLIANT |
| R8 | First baseline | `contract:diff` printed `FIRST-BASELINE skip (no base document exists)` and exited 0. | COMPLIANT |
| R9 | Gate order | `.github/workflows/quality.yml` places Test before Contract and Contract before Build. | COMPLIANT |
| R9 | Shell-specific composition | Contract script assertions found no shell composition or credential embedding. | COMPLIANT |
| R10 | Offline verifiable | Local validate, export, stale, typecheck, test, and build gates passed. | COMPLIANT |
| R10 | Remote-only claim | Review of proposal and apply evidence found the live PostgreSQL obligation recorded as pending and no remote execution claim. | COMPLIANT |

**Compliance summary**: 21/21 scenarios compliant.

## Correctness (static evidence)

| Requirement | Status | Notes |
|---|---|---|
| Contract publication | Implemented | Versioned tracked OpenAPI artifact is generated from Nest metadata and is deterministic. |
| Documented surface | Implemented | Current business and system routes are represented without added business endpoints. |
| Shared schemas | Implemented | Concrete DTO metadata supplies reusable schemas and prevents Prisma contract leakage. |
| Conventions | Implemented | Prefix, casing, IDs, timestamp, semantic responses, and URN conventions are preserved. |
| Offline export | Implemented | Export initializes without listening or connecting and closes safely. |
| Generated client | Implemented | Generated types and typed transport factory are wired and compile. |
| Freshness | Implemented | Temporary-output regeneration compares normalized content without overwriting tracked artifacts. |
| Compatibility | Implemented | First baseline is explicit; later semantic comparisons use the pinned Node API. |
| Gate portability | Implemented | CI uses ordered npm commands and cross-platform Node orchestration. |
| Verification limits | Implemented | Offline claims are bounded and live PostgreSQL remains pending. |

## Design coherence

| Decision | Followed? | Notes |
|---|---|---|
| NestJS decorators as generation source | Yes | Export uses `SwaggerModule.createDocument`. |
| Concrete DTO classes | Yes | DTOs use classes and Swagger metadata, not Prisma models or erased interfaces. |
| Unversioned system paths | Yes | `/`, `/health/live`, and `/health/ready` are documented under the System tag. |
| Typed client factory | Yes | `createApiClient({ baseUrl, fetch, headers })` delegates to `openapi-fetch`. |
| Committed artifacts | Yes | OpenAPI and generated TypeScript outputs are tracked. |
| Semantic compatibility | Yes | `openapi-diff` Node API receives content and portable file URLs. |
| DB-free export | Yes | `createAppForExport()` is initialized without listen or database connection. |
| CI order | Yes | Test precedes contract checks, which precede Build. |

## RED sequence evidence

1. **Clean CRLF checkout:** `npm run contract:check` exited 0 before mutation.
2. **Real mutation:** changed the JSON version from `1.0.0` to `1.0.1` with `apply_patch`.
3. **Required RED:** `npm run contract:check` exited 1, reported `Stale contract artifacts: - apps/api/openapi.json`, and the changed version remained in the tracked file.
4. **Byte-exact restoration:** `git checkout -- apps/api/openapi.json` restored the pre-mutation SHA-256 `F72BE6B53CBF72A7415E19570C097282BAE9134E0C09975FC7B63AD6B76A1321`.
5. **Post-restore GREEN:** `npm run contract:check` exited 0.
6. **Focused regression:** `npm run test --workspace=@repara/api -- src/contract-script.spec.ts` exited 0 with 1 file and 4 tests passed.

## Remediation history

### Remediation round 1

The first verification found four critical defects: public freshness checking overwrote mutations before comparison; catalog response annotations exposed undocumented 500/503 responses; the export published an out-of-scope bearer security scheme; and the Windows compatibility path passed a raw `c:` path to the CLI. The first remediation moved freshness generation to temporary outputs, removed the extra catalog responses, removed bearer-auth publication, and moved compatibility comparison to the pinned Node API.

### Remediation round 2

The second verification found one critical CRLF/LF freshness mismatch. The second remediation normalized CRLF and CR to LF only inside the comparison helper, kept writers unchanged, added the CRLF regression case, and preserved real-content staleness. This final rerun independently observed the clean/RED/restore/clean sequence and the focused 4/4 result.

## Issues

### CRITICAL

None.

### WARNING

1. `npm ci` reported three high-severity audit findings and blocked Prisma postinstall under the local npm `allowScripts` policy. The existing environment-only Prisma generation command resolved the missing generated client; the lockfile remained unchanged and all subsequent gates passed.
2. The full test run emitted an existing Prisma shutdown warning while still exiting 0; no contract assertion failed.

### SUGGESTION

None required for acceptance. Future maintenance could keep the focused public freshness RED sequence and Windows Node-API fixtures as regression tests, which are now present for the remediated paths.

## Overall verdict

**PASS.** All 10 requirements and all 21 scenarios actually present in the acceptance source passed independent static and runtime verification. The implementation is ready for `sdd-archive`; the pending live PostgreSQL acceptance remains orthogonal and must stay explicitly pending.

## Archive notes

- Persisted this final report at `openspec/changes/contrato-openapi/verify-report.md` using direct OpenSpec file persistence because `gentle-ai` is unavailable in this environment.
- The implementation tree was clean before report persistence: `git status --porcelain` was empty and `git diff --check` exited 0.
- Final tracked artifact hashes: `apps/api/openapi.json` `sha256:F72BE6B53CBF72A7415E19570C097282BAE9134E0C09975FC7B63AD6B76A1321`; `packages/api-client/src/generated.ts` `sha256:DBDFD8D6EF125DEE6D47ECF86083B87321E4C95A45069AF6E43A7302DF4745E3`; `package-lock.json` `sha256:ED45C6E50157333DDB13198BEC1CAC629CD2925BD65A6A1593A706CB8B5314B1`.
- Archive is recommended. Do not convert the orthogonal pending PostgreSQL gate into a claim of execution.
