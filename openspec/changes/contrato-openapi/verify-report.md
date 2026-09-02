```yaml
schema: gentle-ai.sdd-verify/v1
status: fail
change: contrato-openapi
artifact_store: openspec
requirements: 10
scenarios: 20
tasks_completed: 5/5
verdict: FAIL
test_command: npm test
test_exit_code: 0
test_output_hash: 2DCF37A38C0B96FB16B13D68641716AB6AACF0ECE9A9B2F4AB7FB8E883DAEB3B
build_command: npm run build
build_exit_code: 0
build_output_hash: 7BEA180FBB5EFDDF8E582A9D4024CCB7844B40CBA8B788653992631D89336E12
blockedReasons:
  - R7 stale-artifact RED check did not fail because contract:check regenerates before comparing.
  - R2 published catalog operations contain undocumented-by-plan 500 and 503 responses.
  - Scope audit found a published JWT bearer security scheme although authentication is out of scope.
  - Windows execution of openapi-diff with a local base path fails before semantic comparison.
next_recommended: focused remediation for R7-FRESHNESS-RED, R2-RESPONSE-SETS, SCOPE-AUTH, and R8/R9-DIFF-WINDOWS, then re-run sdd-verify
```

# Verification Report

## Change and completeness

| Item | Observed |
|---|---|
| Change | `contrato-openapi` |
| Acceptance source | `openspec/changes/contrato-openapi/specs/openapi-contract/spec.md` (the requested root-level `specs/openapi-contract/spec.md` does not exist) |
| Artifact mode | `openspec`; report persisted to the change directory |
| Requirements/scenarios | 10 requirements and 20 scenarios counted from the acceptance source |
| Task completeness | 5/5 phases and every task checkbox are complete; no incomplete-task blocker |
| Strict TDD | Inactive (`strict_tdd: false`); standard verification applied |
| Mutation-restoration tree | After restoring the RED fixtures and before this required report write, `git status --porcelain` was empty; `git diff --check` exited 0. After report persistence, the only status entry is this new expected `verify-report.md` artifact. |

## Per-requirement evidence

| Requirement | Commands | Observed | Result |
|---|---|---|---|
| R1 Contract publication | `$env:DATABASE_URL=$null; npm run contract:export` twice; `Get-FileHash -Algorithm SHA256 apps/api/openapi.json`; `git ls-files apps/api/openapi.json` | Both exports exited 0 and printed `openapi.json written`. Both generated-file hashes were `05C38E752912F7EE78FF0CF479A8C2E2A8E7E67971C6E89BDA0A805974E4EB41`. `apps/api/openapi.json` is tracked. | PASS |
| R2 Surface completeness | Node JSON parse/assertion of `apps/api/openapi.json`; exact response-set assertion | The five required paths exist and no extra business paths were found. Required success/error keys exist, but exact planned sets failed: both `/api/v1/categories` and `/api/v1/districts` observed `200,400,422,500,503` rather than `200,400,422`. Root observed `200,404`; live `200,503`; ready `200,503`. Exact response assertion exited 1. | FAIL (`R2-RESPONSE-SETS`) |
| R3 Shared schemas | Node parse/assertion; `npm run contract:validate` | Validation exited 0. `ProblemDetailsDto` contains `type,title,status,detail,code,traceId,fieldErrors` and 9 stable codes. Category/district envelopes and projections, `MoneyDto` with `125.50`/`PEN`, `TimestampDto` with `date-time`, and `PaginationQueryDto` with `page`/`limit` are present. Catalog parameters are only `active`; pagination is not applied. No Prisma entity names were found. | PASS |
| R4 Conventions fidelity | Node schema inspection; `npm test` (after environment preparation) | Business paths use `/api/v1`; JSON fields are camelCase; IDs are strings; the problem URI example is `urn:reparared:error:INPUT_INVALID`; timestamp format is `date-time`. The complete runtime suite passed, including catalog integration behavior, so no runtime semantic mutation was observed. | PASS |
| R5 Offline export discipline | `$env:DATABASE_URL=$null; npm run contract:export`; `npm run test --workspace=@repara/api -- src/catalogs/catalogs.controller.spec.ts` | Export exited 0 without `DATABASE_URL`. The dedicated regression test passed 1/1 and asserted no `PrismaService.$connect` call and `server.server.listening === false`. | PASS |
| R6 Generated client | `npm run contract:generate`; `npm exec --workspace=@repara/api-client -- tsc --noEmit`; root `npm run typecheck`; search of `packages/api-client` | Generation exited 0 with `openapi-typescript 7.13.0`. Direct client typecheck and root typecheck exited 0. No cookie/session/token/localStorage handling logic exists. Generated structural `cookie?: never` declarations are type-shape placeholders, not runtime handling. Both `packages/api-client/src/generated.ts` and its factory are tracked. | PASS |
| R7 Artifact freshness | `npm run contract:check`; temporary trailing-LF mutation of tracked `apps/api/openapi.json`; `npm run contract:check`; direct `node scripts/contract.mjs stale`; restore with `git checkout --`; final status/hash checks | Fresh `contract:check` exited 0. The required RED mutation test incorrectly exited 0 because `contract:check` first regenerates and overwrites the mutation. The underlying direct stale command did exit 1 on the same mutation. The document was restored byte-for-byte to its pre-mutation checkout hash `54BC00D971FFB5DDB0FEB8BA107DBF82C8DB1DEA627E3E60D4A2EE05C157303A`, and the tree is clean. | FAIL (`R7-FRESHNESS-RED`) |
| R8 Compatibility detection | `npm run contract:diff`; workflow/source inspection; `openapi-diff` semantic fixtures through its Node API; local CLI fixture | `contract:diff` exited 0 and explicitly printed `OpenAPI compatibility: FIRST-BASELINE skip (no base document exists).` The workflow orders Test, Contract gate, Contract compatibility, then Build; scripts contain regeneration/stale/validation and baseline-skip handling. The library API classified a removed path as breaking and an optional property addition as non-breaking. However, the actual Windows CLI invocation with the script's local absolute base path failed with `Unsupported protocol c:` before comparing. | FAIL (`R8-DIFF-WINDOWS`) |
| R9 Gate placement and portability | Node static inspection of root `contract:*` scripts and `.github/workflows/quality.yml`; credential scan | All five root contract commands are npm-syntax-only and contain no `&&`, `;`, or shell-variable expansion. Workflow order is correct and no credential literals were found in scripts/workflow. The local-base `openapi-diff` failure on Windows is a portability defect in the compatibility path. | FAIL (`R9-DIFF-WINDOWS`) |
| R10 Verification limits | Search of proposal/apply-progress; search for remote execution claims | The pending live PostgreSQL acceptance is recorded as orthogonal and unchanged. No remote CI execution is claimed; observed quality commands were run locally/offline. No future endpoint is documented. | PASS |

## Cross-cutting quality evidence

| Check | Observed |
|---|---|
| `npm ci` | Exit 0; `package-lock.json` SHA-256 stayed `ED45C6E50157333DDB13198BEC1CAC629CD2925BD65A6A1593A706CB8B5314B1`. npm reported 3 high-severity audit findings and blocked several install scripts under the local npm `allowScripts` policy. Consequently, the first immediate `npm test` after `npm ci` failed because `.prisma/client/default` was absent; the existing `npm run prisma:generate --workspace=@repara/api` command then exited 0, and the independent full test rerun passed. |
| `npm test` | Exit 0 after the explicit environment-only Prisma client generation: web 1/1 test and API 22/22 files, 127/127 tests passed. |
| `npm run lint` | Exit 0. Existing Next ESLint informational warning reported that a Pages directory was not found. |
| `npm run format:check` | Exit 0; all files matched Prettier style. |
| `npm run typecheck` | Exit 0 for web, API, and API client. |
| `npm exec --workspace=@repara/api-client -- tsc --noEmit` | Exit 0. |
| `npm run build` | Exit 0 for web, API, and API client; output hash recorded in the YAML envelope. |
| `npm run contract:validate` | Exit 0; `OpenAPI document is valid.` |
| Artifact integrity | Before report persistence, `git status --porcelain` was empty and `git diff --check` exited 0. The only post-persistence status entry is this expected report. Tracked-document checkout hash was `54BC00D971FFB5DDB0FEB8BA107DBF82C8DB1DEA627E3E60D4A2EE05C157303A`; generated-client checkout hash was `C114F6179E21CD4953D994894B82EE542436575128829B741F462F1B5261EE18`. |

## Behavioral compliance matrix

| Scenario group | Runtime evidence | Status |
|---|---|---|
| Deterministic publication and offline export | Two independent exports, dedicated DB-free Vitest regression, no listener and no Prisma connect | PASS |
| Surface and shared-schema inspection | Runtime JSON assertion and swagger-parser validation | R2 response-set failure; schema assertions pass |
| Runtime preservation | Full API integration/controller/service suite, 22 files and 127 tests | PASS |
| Generated client and session-leakage check | Generation, direct/root typechecks, source inspection | PASS |
| Fresh/stale artifacts | Fresh check passes; direct stale subcommand fails on mutation | R7 full `contract:check` RED scenario FAILS |
| Breaking/additive compatibility behavior | `openapi-diff` Node API fixtures: removed path breaking, optional property non-breaking | Semantic engine behavior PASS; actual Windows script path FAILS |
| Gate order and offline limits | Static workflow/script inspection, local quality gates, claim search | R9 portability failure; remaining offline checks pass |

## Deviation scrutiny

| Deviation | Judgment |
|---|---|
| `TimestampDto` addition | Legitimate. The acceptance requires an RFC 3339 timestamp component, and the export explicitly includes this metadata model. It does not add a reachable endpoint or runtime behavior. |
| `SystemStatusDto` addition | Legitimate. Root and health 200 responses need a concrete status schema; the class is metadata-only and preserves the existing `{status: "ok"}` behavior. |
| Catalog 500/503 response annotations | Not accepted as fidelity to the requested catalog response sets. They are documentation additions beyond the stated `200/400/422` catalog contract and caused R2 to fail. |
| Bearer/JWT security scheme | Not legitimate for this change. `apps/api/scripts/export-openapi.mjs` calls `.addBearerAuth()`, and the published document contains `components.securitySchemes.bearer`, despite authentication being explicitly out of scope. It is not applied to operations, but it is still auth contract surface and must be removed or explicitly re-scoped. |
| Windows local-base compatibility path | Not accepted as portable. `scripts/contract.mjs` passes a Windows absolute path to `openapi-diff`; the pinned CLI rejected it as protocol `c:`. |

## Pending-gate audit

The live PostgreSQL gate remains pending, orthogonal, and unchanged as recorded in `proposal.md` and `apply-progress.md`. This verification intentionally did not connect to a real database or claim live database acceptance.

## Scope discipline

No new business endpoint, BFF wiring, UI wiring, runtime client use, or Swagger UI was found. The auth scheme is the one scope violation found: it publishes a JWT bearer definition without protecting an operation. The generated client contains no session or credential behavior.

## Issues

### CRITICAL

1. **R7-FRESHNESS-RED** — `contract:check` runs export and generation before its stale comparison, so a manually modified committed artifact is overwritten and the required stale-artifact RED check exits 0. The direct `stale` subcommand does fail, but the public freshness gate does not satisfy the specified scenario.
2. **R2-RESPONSE-SETS** — Both catalog operations publish 500 and 503 responses in addition to the specified 200/400/422 set.
3. **SCOPE-AUTH** — `.addBearerAuth()` publishes a JWT bearer security scheme even though authentication is out of scope.
4. **R8/R9-DIFF-WINDOWS** — With a base document available, the compatibility script passes a Windows local path to `openapi-diff`, which fails with `Unsupported protocol c:` before semantic comparison.

### WARNING

1. **ENV-PRISMA-GENERATION** — In this environment, `npm ci` blocked Prisma postinstall generation, so the first test invocation failed until the existing Prisma generation command was run. The lockfile remained unchanged and the subsequent full suite passed.
2. npm reported existing audit findings; dependency audit remediation was not part of this change.

### SUGGESTION

Add focused automated tests for the public `contract:check` stale scenario and for Windows-compatible base-document compatibility execution so these regressions cannot rely on manual inspection.

## Overall verdict

**FAIL.** The core export, validation, schemas, generated client, offline regression, runtime suite, and quality gates pass independently, but the required stale-check RED behavior fails, the documented catalog response sets and scope boundary are not faithful, and compatibility detection is not portable on Windows when a base document exists. The change is not ready for `sdd-archive`.

## Archive notes

Do not archive this change yet. After focused remediation of `R7-FRESHNESS-RED`, `R2-RESPONSE-SETS`, `SCOPE-AUTH`, and `R8/R9-DIFF-WINDOWS`, rerun the complete independent verification, including the mutation restoration and clean-tree checks. The pending live PostgreSQL obligation remains outside this change and should remain explicitly pending during archive review.

## Focused Remediation Evidence — Revision 1

This section records the apply-phase remediation of the four CRITICAL findings above. The historical verification verdict remains unchanged until `sdd-verify` is rerun independently.

| Finding | Fix applied | Evidence |
|---|---|---|
| R7-FRESHNESS-RED | `contract:check` now writes regenerated OpenAPI and client artifacts to an OS temporary directory, compares them byte-for-byte with tracked artifacts, lists stale paths, and cleans up in `finally`. | Fresh `npm run contract:check` exited 0. A trailing-newline mutation of `apps/api/openapi.json` exited 1 and listed that file; the original bytes were restored. |
| R2-RESPONSE-SETS | Removed catalog 500/503 Swagger annotations from `catalogs.controller.ts`. | JSON assertion reports exactly `200,400,422` for `/api/v1/categories` and `/api/v1/districts`. |
| SCOPE-AUTH | Removed `.addBearerAuth()` from `export-openapi.mjs`. | JSON assertion reports no `components.securitySchemes`; `grep` of the committed document finds no `securitySchemes`. |
| R8/R9-DIFF-WINDOWS | `contract.mjs` now uses `openapi-diff` 0.24.1's Node API with spec content and file-URL fixture locations rather than raw Windows CLI paths. | Focused Vitest local-base fixtures classify a removed path as breaking and an optional property addition as non-breaking; both passed. `npm run contract:diff` still exits 0 with the explicit first-baseline skip. |

Focused quality gates all passed: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run test` (23 files, 130 tests), and `npm run build`. The environment-only Prisma generation note from the original report remains applicable after `npm ci` under the local `allowScripts` policy.

## Re-verification Outcome — Second Focused Remediation

The second independent verification assessed 10 requirements and found 9/10 PASS. The only remaining CRITICAL finding was `R7-FRESHNESS-RED` for line-ending sensitivity: a clean Windows checkout can provide CRLF tracked artifacts while regenerated output is LF, causing the fresh comparison to fail despite identical logical content.

The remediation normalizes both tracked and regenerated content from CRLF or CR to LF inside the stale comparison helper only. Export and generation writers remain unchanged and continue writing LF. The focused regression now proves CRLF-vs-LF content is fresh while a real content difference remains stale; the clean `npm run contract:check` path passes, and the real mutation scenario exits 1, preserves the mutation, restores it byte-exactly, and passes cleanly afterward.
