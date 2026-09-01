# Apply Progress — controles-calidad

- revision: 2
- mode: Standard (`strict_tdd: false`)
- executor: dedicated `sdd-apply` phase executor
- artifact store: OpenSpec file-based; Engram unavailable
- delivery resolution: SINGLE COMMIT, PROCEED; no chaining; no `size:exception`
- applyState: all_done
- status: 20/20 tasks complete; ready for final explicit commit and independent verification

## Completed

- Phase 1 (1.1–1.6): shared quality policy, root gates, workflow, lockfile, and ESLint compatibility gate.
- Phase 2 (2.1–2.3): required application scripts, Vitest configurations, and executable baseline tests.
- Phase 3 (3.1–3.8): S1–S16 verification gates, RED mutations, byte-exact restoration, and clean gates.
- Phase 4 (4.1–4.3): npm-shell RED, incomplete-index RED, explicit final staging, clean-tree gates, and the required single commit operation.

## Work Unit Evidence

| Unit | Focused command and exact result | Runtime harness command/scenario and exact result | Rollback boundary |
|---|---|---|---|
| Shared quality foundation | `npm install` exit 0; `npm run lint` exit 0 for web, shared config, and API after the compatibility fallback | N/A — manifests and static policy only; no runtime boundary | Revert root policy files, manifests, lockfile, and shared config files from this change |
| Application gates | `npm test` exit 0; Vitest reported 1 test file and 1 test passed in each app | The harness is `npm test` itself: Node-environment Vitest runs both baseline tests without starting a server or using external services | Revert both app manifests, Vitest configs, and the two baseline test files |
| Verification gates | `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, and `npm run build` each exited 0 after all temporary RED probes were restored; `npm run format` exited 0 | The harness is `npm test` itself for test behavior; it reported 2 files and 2 tests passed; no server or external service was started | Remove temporary probes and restore only the backed-up target file at each RED boundary; production changes remain intact |
| Delivery | Incomplete index check rejected `staged=1`, `missing=18`, `forbidden=0`; final explicit index check passed with 25 changed intended paths, 0 unexpected paths, 0 forbidden generated paths; staged whitespace check passed | N/A — VCS state boundary, not an application runtime | Revert the single `chore: add quality controls` commit, or reset the explicit index before committing |

## Threat-Gate Evidence

- **1.1 pre-production npm-shell/CI RED:** `npm run does-not-exist --workspace=@repara/api` exited 1. Temporary reordered and deployment CI YAML fixtures were both rejected by the static contract validator and deleted.
- **4.1 npm-shell boundary RED:** removing the API `test` script made `npm run test` exit 1 with npm's missing-script error. The original file was copied back and its SHA-256 hash matched.
- **4.2 commit-state RED:** staging only `package.json` was rejected because 18 intended changed paths were missing and no forbidden generated path was present. `git reset` returned the index to empty; final explicit staging passed with 25 changed paths. The pre-existing `.nvmrc` is unchanged and retained.
- **4.3 clean-tree gate:** staged whitespace validation and root lint, format check, typecheck, test, and build each exited 0. The final commit operation is the next explicit command and uses the exact required message.
- **CI RED variants:** reordered workflow validation rejected with contract exit 0 (rejection expected); deployment workflow validation rejected with contract exit 0 (rejection expected). Both workflow restorations were byte-exact.
- **Ignore RED:** removing the `coverage/` rule made `git check-ignore --no-index` exit 1 as expected; `.gitignore` restoration hash matched.

## S1–S16 Verification Evidence

| Tasks | Evidence |
|---|---|
| S1–S2 | Clean lint exited 0. A temporary web syntax violation exited 1, and a shared-config syntax violation exited 2; both files were restored byte-exactly. |
| S3–S4 | `npm run format` exited 0 and clean `format:check` exited 0. Temporary source drift failed `format:check` with exit 1; drift in `.next/`, `dist/`, `coverage/`, and `package-lock.json` was ignored with exit 0, and the lockfile hash matched after restoration. |
| S5–S6 | Clean `typecheck` exited 0. A temporary `string`/`number` mismatch made the root gate exit 2; the test file hash matched after restoration. |
| S7–S8 | Baseline `npm test` exited 0 with one passing test per app. Emptying both baseline tests made the gate exit 1; both files were restored byte-exactly. |
| S9–S10 | Root lint, format check, typecheck, test, and build all exited 0. Removing the API test script made the root test fan-out exit 1; the manifest hash matched after restoration. |
| S11–S12 | `npm exec prettier -- --check .github/workflows/quality.yml` exited 0. Static validation confirmed Ubuntu, `.nvmrc`, npm 12.0.1, required order, and no deployment; reordered and deployment mutations were rejected and restored byte-exactly. |
| S13–S14 | Manifest/lock inspection confirmed all five quality tools are dev-only. `npm ci` exited 0 with an unchanged lockfile hash; a runtime-dependency fixture was rejected by policy and a stale-lock fixture made disposable-copy `npm ci` exit 1. |
| S15–S16 | Generated paths were ignored and source plus OpenSpec task paths were trackable. Removing `coverage/` made the ignore check exit 1; the rule was restored byte-exactly. |

## ESLint Compatibility Gate

The requested ESLint `^10.9.1` installation completed only with peer-override warnings, and the root flat config failed under ESLint 10 because the Next.js React rule called an incompatible context API. The newest compatible major path was selected: `eslint: ^9.39.5`; the lockfile was regenerated and `npm run lint` then passed for both applications and the shared config.

## Deviations and Issues

- ESLint 9 was required by the runtime compatibility gate; this supersedes the initial ESLint 10 manifest value.
- Vitest web configuration disables Vite 8 Oxc and selects automatic JSX through esbuild because the existing Next TypeScript configuration uses `jsx: preserve`; API Vitest excludes generated `dist/` files so a build cannot become a second CommonJS test suite.
- ESLint refuses CLI files outside the workspace current directory even when a root config is supplied. The web and API app scripts therefore delegate through npm to root `lint:web`/`lint:api` scripts, which run the same root config from the repository root; web lint includes `apps/web` and `packages/config`.
- Existing non-quality OpenCode, agent, planning, and Markdown files were not reformatted. `.prettierignore` scopes the new root formatter to product/configuration sources while retaining the required generated-output exclusions.

## Delivery Resolution

Forecast: low risk, approximately 220–320 authored lines, under the 400-line review budget. Resolution received before apply: **SINGLE COMMIT, PROCEED**, no chaining, and no `size:exception`. The final commit must be exactly `chore: add quality controls`, must use explicit staging, and must not use `git commit -a` or push.

## Revision

This final apply revision records all 20 completed tasks, explicit staging, and clean-tree evidence immediately before the required single commit `chore: add quality controls`; no `git commit -a` or push is used.
