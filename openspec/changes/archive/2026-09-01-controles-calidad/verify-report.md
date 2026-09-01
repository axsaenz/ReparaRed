```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:26c1d11eaa6a0a00f17d64adc58ff56c8eafa19deb538d3616a3cf229cab389d
verdict: pass
blockers: 0
critical_findings: 0
requirements: 8/8
scenarios: 16/16
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:68030861f366ef1beebe3abb63a99648f2dc7213fcd42bba56d20c85f69e5a26
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:26c7239803853ed185da98cf6d03ef523cb3ad5840f0a0c916a35749131f6266
```

## Verification Report

**Change**: `controles-calidad`  
**Version**: Delta specification, 8 added requirements / 16 scenarios  
**Mode**: Standard (`strict_tdd: false`)

### Completeness

| Metric | Value |
|---|---:|
| Tasks total | 20 |
| Tasks complete | 20 |
| Tasks incomplete | 0 |

All task checkboxes in `tasks.md` are checked, and `apply-progress.md` reports `all_done`. The independent verifier did not rely on that report for runtime evidence.

### Build and Tests Execution

| Command | Exit | Observed output hash |
|---|---:|---|
| `npm run lint` | 0 | `sha256:084030ad5c9d70aeda852eb5a70e29ab7f2eb0192c3d2d720dad3f19196675a3` |
| `npm run format:check` | 0 | `sha256:e76c51deec75d99d4a672b3b525d9f1586b84c0cea8e8c928f48f5cb0bf3aab9` |
| `npm run typecheck` | 0 | `sha256:a6cc650369a87f5a03581b77ff3aae2ba090237447a1a263ef61b0b724ef009c` |
| `npm test` | 0 | `sha256:68030861f366ef1beebe3abb63a99648f2dc7213fcd42bba56d20c85f69e5a26` |
| `npm run build` | 0 | `sha256:26c7239803853ed185da98cf6d03ef523cb3ad5840f0a0c916a35749131f6266` |

**Build**: Passed. The root build ran the Next.js web build and the API TypeScript build.  
**Tests**: Passed. Vitest reported one file and one test passed in each application, for two files and two tests total.  
**Coverage**: Not available; no coverage threshold is specified for this change.

### Scenario Verification

| ID | Commands | Observed | Result |
|---|---|---|---|
| S1 | `npm ci`; `npm run lint` | Exit 0. The root gate ran the web helper over `apps/web` and `packages/config`, then the API helper over `apps/api`; no extra setup was needed beyond the committed install. | PASS |
| S2 | Temporary `var` in `apps/web/src/app/layout.test.tsx` and `packages/config/eslint.mjs`; `npm run lint` | App mutation exited 1 with `no-var` and unused-variable findings. Shared-config mutation exited 1 with unused-variable findings. Both source hashes matched their backups after restoration. | PASS |
| S3 | Temporary quote drift; `npm run format:check`; `npm run format` | Drifted source check exited 1. The write command exited 0 and restored the target to its original bytes before the temporary backup restoration. | PASS |
| S4 | Clean `npm run format:check`; `npm exec prettier -- --check apps/web/.next/package.json apps/api/dist/main.js package-lock.json` | Clean check exited 0. The excluded-output spot check also exited 0. Formatter output enumerated application/package TypeScript, TSX, MJS, JS, JSON, and workflow YAML sources while omitting generated output, lockfile, and planning/documentation paths. | PASS |
| S5 | `npm run typecheck`; `npm run typecheck --workspace=@repara/web`; `npm run typecheck --workspace=@repara/api` | All three commands exited 0. Both app manifests invoke standalone `tsc --noEmit -p tsconfig.json`; neither invokes build, and both extend the strict shared base. | PASS |
| S6 | Temporary `const n: number = 's';` in the web test; `npm run typecheck` | Exit 2 with `TS2322: Type 'string' is not assignable to type 'number'`. The test source was restored byte-exactly. | PASS |
| S7 | `npm test` | Exit 0. Vitest ran one passing test file and one passing test in `apps/web`, then one passing test file and one passing test in `apps/api`. Both configs use the Node environment. | PASS |
| S8 | Empty temporary `apps/web/src/app/layout.test.tsx`; `npm test` | Exit 1 with `No test suite found in file`; the API suite still ran and passed. The empty test file was restored byte-exactly. | PASS |
| S9 | `npm run lint`; `npm run format`; `npm run format:check`; `npm run typecheck`; `npm test`; `npm run build`; temporary root-script contract assertion | Every root gate exited 0, including `format` (write mode). The assertion exited 0 and found npm-only scripts plus web/API fan-out for required gates. | PASS |
| S10 | Remove the API `test` script from a temporary manifest; `npm test` | Exit 1 with npm's explicit `Missing script: "test"` error for `@repara/api`; the manifest hash matched its backup after restoration. | PASS |
| S11 | `npm exec prettier -- --check .github/workflows/quality.yml`; temporary static workflow assertion | Both checks exited 0. The workflow has one Ubuntu job, `.nvmrc`, npm 12.0.1, immutable install, and the required quality steps. | PASS |
| S12 | Reordered temporary workflow copy; deployment temporary workflow copy; static assertion | The reordered copy exited 1 for required-order violation. The deployment copy exited 1 for forbidden deployment. The committed workflow was never mutated. | PASS |
| S13 | Temporary manifest policy assertion; `npm ci`; SHA-256 before/after comparison | Policy assertion exited 0: quality tools are in devDependencies and absent from runtime dependency blocks. `npm ci` exited 0 and the committed lockfile hash was unchanged. | PASS |
| S14 | Runtime-dependency fixture policy assertion; stale-lock fixture with `npm ci` | Runtime-quality fixture assertion exited 1. Disposable stale-lock `npm ci` exited 1 with npm `EUSAGE` and an out-of-sync lockfile message. Both fixtures were deleted. | PASS |
| S15 | `git check-ignore --no-index` for generated paths and source/planning paths; `.editorconfig` inspection | `.next/`, `dist/`, `coverage/`, and `.eslintcache` returned exit 0. Application sources, `PRD.md`, `BACKLOG.md`, and `openspec/` returned exit 1. `.editorconfig` exists with UTF-8, LF, final newline, two-space indentation, and Markdown whitespace override. | PASS |
| S16 | Create temporary coverage/cache sentinels; `git check-ignore`; `git status --porcelain`; remove `coverage/` rule temporarily and recheck | Created generated sentinels were ignored (exit 0) and status remained empty. Removing `coverage/` made the ignore check exit 1; `.gitignore` was restored byte-exactly. A clean-tree check was empty before this required report was written. | PASS |

**Compliance summary**: 16/16 scenarios passed at runtime; 8/8 requirements are complete.

### Correctness (Static Evidence)

| Requirement | Status | Evidence |
|---|---|---|
| Workspace Lint Gate | Implemented | Root flat ESLint config consumes `@repara/config/eslint`; root lint explicitly covers web, shared config, and API sources, and the negative probe fails. |
| Workspace Format Gate | Implemented | Root Prettier write/check commands, shared formatter export, generated-output exclusions, and source-drift mutation behave as specified. |
| Standalone Application Type Gate | Implemented | Both applications extend `@repara/config/tsconfig.base.json`, expose standalone `tsc --noEmit` scripts, and reject the temporary type error. |
| Application Unit Test Gate | Implemented | Node-based Vitest configs use `passWithNoTests: false`; one local unit test passes per application and an empty suite fails. |
| Root Quality Orchestration | Implemented | Required root scripts use npm workspace syntax without `--if-present` or shell operators; missing API script fails the root test gate. |
| Reproducible CI Quality Workflow | Implemented | `.github/workflows/quality.yml` contains one sequential Ubuntu job with Node from `.nvmrc`, npm 12.0.1, and install → lint → format check → typecheck → test → build. |
| Development-Only Quality Dependencies | Implemented | Quality dependencies are dev-only in manifests, the lock root classifies them as devDependencies, and immutable install succeeds without lockfile changes. |
| Generated Quality Output Hygiene | Implemented | Git ignores generated quality paths while retaining source/planning paths, and `.editorconfig` mirrors formatter basics. |

### Design Coherence

| Decision | Followed? | Evidence |
|---|---|---|
| Shared ESLint policy in `packages/config` with narrow app scopes | Yes, with documented compatibility fallback | `packages/config/eslint.mjs` is exported and spread by the root config; web and API scopes are explicit. ESLint 9.39.5 is used because the attempted ESLint 10 path was incompatible with the installed Next rule implementation. |
| Prettier single-quote, semicolon, and trailing-comma policy | Yes | `.prettierrc.json` and `packages/config/prettier.mjs` match, and both write/check behavior and source scope were executed. |
| Vitest Node baseline tests with no server or external service | Yes | Both test files import only Vitest and local application code; neither starts a server, performs a network request, or imports the API bootstrap. Web config enables automatic JSX and disables Oxc; API config excludes `dist/`. |
| npm-only root fan-out and sequential CI | Yes | Root scripts and workflow were statically asserted, then each local gate was executed successfully. |
| No item #3+ runtime concerns in the change | Yes | No new environment validation, health endpoint, Prisma, Supabase, OpenAPI, deployment, or runtime dependency was added. The API listener found in `apps/api/src/main.ts` predates this change and was not modified. |

### Deviation Scrutiny

| Known deviation | Independent result |
|---|---|
| ESLint 10 fallback to ESLint 9.39.5 | Confirmed and acceptable. Installed `eslint@9.39.5` is the newest compatible path recorded by apply; both application lint paths and the shared policy pass, and the temporary violations fail. This is a non-blocking design-version warning, not a specification failure. |
| App lint scripts delegate through root npm helpers | Confirmed and acceptable. `apps/web` delegates to `lint:web`, which includes `apps/web` and `packages/config`; `apps/api` delegates to `lint:api`, which includes `apps/api`. The root gate executes both without silent skipping. |
| `.prettierignore` excludes planning/documentation paths | Confirmed and bounded. Exclusions cover generated outputs, the lockfile, generated `next-env.d.ts`, `.agents/`, `.opencode/`, `openspec/`, Markdown documents, and `opencode.json`; no application or package formatter-scope source directory is excluded. |
| Web automatic JSX/Oxc setting and API `dist/` exclusion | Confirmed and acceptable. The settings are present in the two Vitest configs, and the two baseline tests execute successfully without generated API tests being collected. |

### Scope-Direction Check

The latest implementation commit changes quality configuration, manifests, the lockfile, two baseline tests, and SDD artifacts only. No runtime dependency was added: application runtime dependency blocks are unchanged in purpose, while all new quality tools are development dependencies. No item #3 or later concern leaked into tooling; the existing API bootstrap listener is outside the changed file set. The 9,475-line lockfile diff is generated dependency metadata, not authored runtime logic.

### Issues Found

**CRITICAL**: None.  
**WARNING**:

1. `design.md` still states ESLint `^10.9.1` in its technical-approach and dependency table sections, while the compatibility-tested implementation uses `^9.39.5`; the fallback is documented in `apply-progress.md` and all gates pass.
2. `openspec/config.yaml` retains the earlier planning-only discovery (`projects: []` and no workspace test runner), which is stale relative to the now-scaffolded applications. This does not affect the quality commands but should be refreshed during normal SDD maintenance.
3. `npm run lint` emits the non-failing Next.js notice that no root `pages` directory exists; the App Router project still exits 0 and the notice is unrelated to a lint violation.

**SUGGESTION**:

1. Update the design dependency table and refresh the OpenSpec project/testing discovery after archive so planning metadata matches the committed workspace.
2. Consider disabling the unused Pages Router notice in the Next-specific lint configuration if quieter CI output is desired; this is not required for acceptance.

### Verdict

**PASS WITH WARNINGS**

All 8 requirements and all 16 acceptance scenarios passed independent static/runtime verification. The remaining warnings are documentation/toolchain-coherence observations only and do not block archive.

### Notes for Archive

- `openspec/changes/controles-calidad/verify-report.md` is the required OpenSpec verification artifact and was written directly because the execution context declares the `openspec` file store and the external `gentle-ai` validator is unavailable.
- The worktree was clean after every temporary mutation and immediately before this report was persisted; this report is the expected new verification artifact in the change directory.
- The next phase is `sdd-archive`; archive should merge the accepted `monorepo-workspace` delta and update the SDD state without changing the verified implementation.
