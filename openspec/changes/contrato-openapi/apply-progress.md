# Apply Progress: OpenAPI Contract

## Delivery Resolution

- Mode: `size:exception` approved.
- Boundary: one cohesive implementation unit covering all five phases; no remote chain.
- Execution mode: Standard (the project has `strict_tdd: false`).

## Completed Tasks

- [x] Phase 1 — DTO metadata and system/catalog documentation.
- [x] Phase 2 — DB-free deterministic export pipeline.
- [x] Phase 3 — Pinned tooling and generated typed client package.
- [x] Phase 4 — Cross-platform contract scripts, CI gate, and verification.
- [x] Phase 5 — Intended-file staging, single commit, and clean-tree verification.

## Work Unit Evidence

| Phase | Focused test command and exact result | Runtime harness command/scenario and exact result | Rollback boundary |
|---|---|---|---|
| 1 | `npm run typecheck --workspace=@repara/api` — exit 0. | `npm run test --workspace=@repara/api` — exit 0; 22 files and 127 tests passed. | Revert DTO files, controller metadata, and system documentation annotations. |
| 2 | `npm run contract:validate` — exit 0; OpenAPI document is valid. | `npm run contract:export` twice with SHA-256 `05C38E752912F7EE78FF0CF479A8C2E2A8E7E67971C6E89BDA0A805974E4EB41` both times — exit 0; in-process export regression passed with no listener and no Prisma `$connect`. | Revert `createAppForExport()` and `apps/api/scripts/export-openapi.mjs`; remove the committed document. |
| 3 | `npm run typecheck --workspace=@repara/api-client` — exit 0. | `npm run contract:generate` — exit 0; `openapi-typescript 7.13.0` generated `packages/api-client/src/generated.ts`. | Revert client package wiring and remove generated client output. |
| 4 | `npm run contract:check` — exit 0; regeneration, stale-check, validation, and workspace typechecks passed. | `npm run contract:diff` — exit 0; `FIRST-BASELINE skip` recorded because no base document exists. | Revert root contract scripts and the workflow contract gate. |
| 5 | `git diff --cached --check` — exit 0 before commit. | `git status --short` after the commit — clean tree. | Revert commit `chore: automate OpenAPI contract`. |

## RED Evidence

| Threat case | Command and exact result |
|---|---|
| Credential literals in committed contract and export scripts | `rg -n -i "postgres(?:ql)?://|password|secret|api[_-]?key|token" apps/api/openapi.json apps/api/scripts scripts` — no matches; exit 1 interpreted as a clean scan. |
| Database-free export | In-process Vitest regression deletes `DATABASE_URL`, spies on `PrismaService.prototype.$connect`, initializes the export app, creates the document, asserts `server.server.listening === false`, and passes without a connect call. |

## Quality Gates

- `npm run lint` — exit 0.
- `npm run format:check` — exit 0.
- `npm run typecheck` — exit 0; web, API, and API client typechecks passed.
- `npm run test` — exit 0; web and API suites passed (22 API files, 127 tests).
- `npm run build` — exit 0; web, API, and API client builds passed.
- `npm run contract:check` — exit 0.
- `npm run contract:diff` — exit 0 with explicit first-baseline skip.

## Accounting and Pending Work

- Final authored count: 599 implementation lines (staged additions plus deletions, excluding the tracked generated goldens, lockfile, and planning artifacts); generated `openapi.json` and `generated.ts` are tracked goldens.
- Pending live PostgreSQL acceptance remains orthogonal and unchanged; this change proves offline export only.
- Issues: npm reports existing audit findings in the workspace; dependency pins and lockfile are intentional and no audit remediation was included.
- Phases complete: **5/5**.

## Focused Remediation Revision 1

The independent verification failed with four CRITICAL findings. This revision addresses only those findings and preserves the completed task semantics in `tasks.md`.

| Finding | Action | Re-check evidence |
|---|---|---|
| R7-FRESHNESS-RED | `contract:check` now exports and generates into an OS temporary directory, compares bytes against both tracked artifacts, reports every stale file, and always removes the temporary directory. In-place writes remain in the explicit export and generate commands. | Fresh `npm run contract:check` exited 0. A trailing-newline mutation of tracked `apps/api/openapi.json` exited 1 with `Stale contract artifacts: - apps/api/openapi.json`; the original bytes were restored. The focused Vitest stale-helper test passed and verified the tracked fixture was not replaced. |
| R2-RESPONSE-SETS | Removed the 500 and 503 `@ApiResponse` annotations from both catalog operations. | Parsed `apps/api/openapi.json` reports exactly `200,400,422` for both catalog operations; the full test suite passed. |
| SCOPE-AUTH | Removed bearer-auth builder configuration from the export script. | Parsed `apps/api/openapi.json` has no `components.securitySchemes`; the committed-document grep is clean. |
| R8/R9-DIFF-WINDOWS | Replaced the raw-path `openapi-diff` CLI invocation with the pinned package's Node API, passing spec content and file-URL fixture locations. | `contract-script.spec.ts` passed breaking-removed-path and additive-optional-property local fixture tests; `npm run contract:diff` retained the explicit first-baseline skip. |

### Remediation Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `npm run test --workspace=@repara/api -- src/contract-script.spec.ts` — exit 0; 1 file and 3 tests passed. |
| Runtime harness command/scenario and exact result | `npm run contract:check` — exit 0 on fresh artifacts; public stale mutation — exit 1 and listed the mutated artifact; `npm run contract:diff` — exit 0 with first-baseline skip. |
| Quality gates | `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run test`, and `npm run build` — all exit 0. |
| Rollback boundary | Revert the remediation changes in `scripts/contract.mjs`, `apps/api/scripts/export-openapi.mjs`, `apps/api/src/catalogs/catalogs.controller.ts`, the focused spec, regenerated artifacts, and this evidence revision. |

### Environment Note

After `npm ci`, the local npm `allowScripts` policy can block Prisma postinstall generation. If `.prisma/client` is missing, run `npm run prisma:generate --workspace=@repara/api` once and rerun the gates; this is an environment preparation step, not a code change.

## Focused Remediation Revision 2

The second independent verification passed 9/10 requirements and isolated one remaining CRITICAL finding: the fresh path was not line-ending-agnostic on Windows. Git autocrlf can check out tracked artifacts with CRLF while generators write LF, so byte comparison rejected logically identical artifacts.

| Finding | Action | Re-check evidence |
|---|---|---|
| R7-FRESHNESS-RED (line endings) | `findStaleArtifacts()` now normalizes both tracked and regenerated content by converting CRLF and CR to LF before comparison. Export and generation writers remain unchanged and continue writing LF. | Focused Vitest stale-helper spec passed 4/4 tests, including CRLF-vs-LF freshness and a real content difference remaining stale. Clean `npm run contract:check` exited 0. A real `apps/api/openapi.json` version mutation exited 1, listed the mutated artifact, and was preserved until restored with `git checkout --`; the restored clean check exited 0. |

### Remediation Work Unit Evidence — Revision 2

| Evidence | Result |
|---|---|
| Focused test command and exact result | `npm run test --workspace=@repara/api -- src/contract-script.spec.ts` — exit 0; 1 file and 4 tests passed. |
| Runtime harness command/scenario and exact result | `npm run contract:check` — exit 0 on the restored clean tree; changing `openapi.json` version `1.0.0` to `1.0.1` caused exit 1 with `Stale contract artifacts: - apps/api/openapi.json` and preserved the mutation; `git checkout -- apps/api/openapi.json` restored it; the clean check exited 0 afterward. |
| Rollback boundary | Revert the line-ending normalization in `scripts/contract.mjs`, the CRLF regression case in `apps/api/src/contract-script.spec.ts`, and these revision-2 evidence sections. |

### Quality Gates — Revision 2

- `npm run lint` — exit 0.
- `npm run format:check` — exit 0.
- `npm run typecheck` — exit 0.
- `npm run test` — exit 0; full workspace suites passed with the API suite reporting 23 files and 131 tests.
- `npm run build` — exit 0.
