## Exploration: BACKLOG item #2 — Quality controls

**Change:** `controles-calidad` (BACKLOG.md item #2)

**Scope:** Add linting, formatting, type checking, tests, and reproducible local/CI gates to the monorepo created by item #1. This change modifies the `monorepo-workspace` capability; items #3 and later remain outside this exploration.

**Sources inspected:** `BACKLOG.md`, `TECH-DESIGN.md`, `openspec/config.yaml`, `openspec/specs/monorepo-workspace/spec.md`, the archived `inicializar-monorepo` artifacts, all 20 ADRs in `adrs/`, and the current workspace manifests/configuration/source files.

## Current State

- BACKLOG item #2 explicitly requires lint, format, type checking, tests, and reproducible builds in local development and CI. It depends only on item #1.
- The workspace is an npm monorepo with four members, Node 24 pinned through `.nvmrc`/`engines`/`packageManager`, and a committed npm lockfile. The repository currently has two commits on `main`.
- The root scripts are `build`, `build:web`, `build:api`, and `ci:check`; `ci:check` currently runs only `npm ci`. The root build uses `npm run build --workspaces --if-present`.
- `apps/web` is a minimal Next.js 16 App Router + React 19 + TypeScript skeleton. `apps/api` is a minimal NestJS 12 + Fastify 5 TypeScript skeleton compiled as CommonJS with `tsc`. Neither workspace has lint, format, typecheck, or test scripts.
- `packages/config` exports only a strict shared TypeScript base. `packages/api-client` is a dependency-free JavaScript placeholder with no build or test tooling.
- There are no ESLint, Prettier, Vitest, Jest, oxlint, coverage, test files, `.github/workflows/`, or editor-quality configuration files. Current assurance is limited to the web/API build commands, with TypeScript compilation occurring as part of those builds; there is no standalone type gate.
- `openspec/config.yaml` confirms that strict TDD is disabled because no workspace-level test command currently covers the scaffolded projects. The existing `monorepo-workspace` spec already requires immutable installs, shared TypeScript configuration, successful builds, and cross-platform npm scripts, but has no quality-gate requirement.

### Decisions already constrained

- TECH-DESIGN §3.4 fixes `packages/config` as the home for shared lint/TypeScript configuration and fixes the `apps/web`, `apps/api`, `packages/api-client`, and `packages/config` layout.
- TECH-DESIGN §12.2 fixes the broad pipeline order: immutable install, static analysis, type checking and tests, then OpenAPI/client checks, builds, controlled migrations, deployment, and smoke tests. Item #2 owns only the quality/build portion; OpenAPI belongs to item #10 and migrations/deployment to later items.
- TECH-DESIGN §13 fixes the eventual verification layers (unit, integration, contract, and end-to-end), but does not select a runner or define a coverage target. Item #2 should establish the runner and baseline without implementing domain scenarios from later items.
- ADR-0001 keeps the monorepo boundary; ADR-0004 and ADR-0005 keep Next.js/TypeScript and NestJS/Fastify/TypeScript. ADR-0008 requires production deployment to follow successful build, static analysis, and automated tests, but does not name a CI provider.
- No ADR selects ESLint, Prettier, Vitest, Jest, oxlint, GitHub Actions, a coverage threshold, or pre-commit hooks. The archived item #1 design does lock npm workspaces, no task runner, CommonJS for the API, and npm-syntax-only cross-platform scripts; quality tooling must preserve those decisions.

## Affected Areas

- `package.json` and `package-lock.json` — add dev-only quality dependencies and root orchestration commands for lint, format check, typecheck, tests, and the existing builds; the lockfile must remain the source for immutable `npm ci`.
- `apps/web/package.json` and `apps/api/package.json` — add per-application quality scripts and runner configuration. The API configuration must accommodate decorators and its CommonJS output; the web configuration must accommodate Next.js App Router/server-oriented modules.
- `apps/web/` and `apps/api/` test/config files — add minimal baseline tests that prove the runners execute without introducing business logic, Prisma, external services, or the API operational foundation. Later feature changes own their domain, integration, contract, and end-to-end suites.
- `packages/config/package.json` and new shared config files — expand the package from a TypeScript-only base to reusable lint/format policy or shared config fragments, while retaining the existing strict TypeScript base and exports. The exact root-versus-package config shape is open.
- Root quality configuration — likely `eslint.config.mjs`, a Prettier configuration and ignore file, and optionally `.editorconfig`. Generated `.next/`, `dist/`, `*.tsbuildinfo`, and coverage output must not become quality failures or tracked artifacts.
- `.github/workflows/quality.yml` (or equivalent) — add CI for one immutable install followed by lint, format check, typecheck, tests, and builds. Deployment jobs, secrets, migrations, OpenAPI generation, and platform configuration are not part of this change.
- `openspec/changes/controles-calidad/specs/monorepo-workspace/spec.md` in the later spec phase — provide the delta that modifies workspace-level behavior. `state.yaml` is orchestration metadata and is not an implementation target.

### Boundary analysis

**In scope:** dev-only quality dependencies; shared lint/format policy; per-workspace scripts; standalone TypeScript checks; baseline unit/smoke test execution; optional report-only coverage; root build reproducibility; immutable-install verification; cross-platform npm orchestration; CI workflow; and ignore/editor rules needed by those controls.

**Out of scope:** application business logic; domain or authorization behavior; NestJS environment validation, uniform errors, tracing, structured logs, or health checks from item #3; Prisma/PostgreSQL and migration work from item #4; OpenAPI generation/client compatibility from item #10; Vercel/Railway/Supabase environments, secrets, and deployment release jobs from item #11; and feature-level integration or end-to-end flows that require those later capabilities.

**Hooks:** Husky or mandatory pre-commit hooks are not required to satisfy the backlog wording and should remain out of scope for this item. CI is the authoritative required gate; an optional local hook can be considered later without making OneDrive path behavior part of the product change.

## Approaches

### Stack comparison

| Approach                                                             | Pros                                                                                                                                                                                                                                        | Cons                                                                                                                                                                                                                | Effort      |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **A. ESLint flat config + Prettier + Vitest for both apps**          | Mature TypeScript and Next.js integration; one test runner and one mental model; Vitest can exercise the API without adopting Nest CLI defaults; separate Node/web test environments remain possible; fits the existing TypeScript monorepo | Next.js 16 and its ESLint config/plugin versions must be validated; decorator-aware API rules need tuning; App Router component tests need an explicit environment; coverage adds another dev dependency if enabled | Medium      |
| **B. Oxlint + Prettier + Vitest for both apps**                      | Fast linting; aligns with the modern NestJS 12 generated-project direction; keeps one test runner and a small CI surface                                                                                                                    | Oxlint was not selected by any ADR; shared rules and Next.js 16 integration must be proven for this hand-written skeleton; migration or rule gaps could produce weaker policy than the established ESLint ecosystem | Medium      |
| **C. ESLint flat config + Prettier + Vitest for web + Jest for API** | Jest has extensive NestJS examples and familiar module-mocking patterns; web can use a fast Vite-oriented runner                                                                                                                            | Two test runners, two configuration models, duplicated CI/scripts, and additional CommonJS/TypeScript transform decisions; no design or ADR requires the NestJS conventional choice                                 | Medium–High |

The framework-generated NestJS default of Vitest plus oxlint is not an inherited decision: this API was hand-written, uses CommonJS and direct `tsc`, and was not generated with the Nest CLI. It is therefore an option rather than a constraint.

### Open decisions for the proposal

1. **Lint tool and config shape:** root ESLint flat config with `typescript-eslint` and Next.js-specific support; oxlint; or a split/hybrid policy. **Recommendation:** ESLint flat config, with reusable policy in `packages/config` and narrow app-specific overrides. Validate the exact Next.js 16 compatibility before implementation.
2. **Formatter:** Prettier as a dedicated formatter versus a combined tool such as Biome. **Recommendation:** Prettier, because the design only needs a stable formatter and already leaves lint selection open; avoid coupling the formatter to framework-specific lint behavior.
3. **Test runner:** Vitest in both apps versus Vitest for web and Jest for API. **Recommendation:** Vitest in both apps, with per-app configuration and a Node environment for API tests. This avoids introducing Nest CLI conventions and keeps the monorepo gate uniform.
4. **Baseline test depth:** runner-only `passWithNoTests` versus a small executable test in each app. **Recommendation:** add minimal baseline tests for both app skeletons; do not let an empty passing suite create false assurance. Defer real integration, contract, and end-to-end scenarios to the backlog items that introduce those boundaries.
5. **Coverage:** no measurement, report-only coverage, or a blocking percentage. **Recommendation:** no blocking threshold in item #2 because TECH-DESIGN defines none and the repository has no domain tests yet. If instrumentation is added, publish report-only coverage and defer a numeric threshold to a later evidence-backed decision.
6. **Workspace orchestration:** root scripts that fan out to app scripts versus a new task runner or shell-composed aggregate command. **Recommendation:** preserve the no-task-runner decision and use npm workspace flags plus separate root commands (`lint`, `format`, `format:check`, `typecheck`, `test`, `build`). Do not use shell operators or rely on `--if-present` for required app gates; inert placeholder packages may remain intentionally scriptless.
7. **CI platform and shape:** GitHub Actions versus provider-specific build checks; one sequential job versus several jobs. **Recommendation:** add a GitHub Actions quality workflow with one Ubuntu job and explicit ordered steps: setup pinned Node/npm, `npm ci`, lint, format check, typecheck, test, and build. This directly satisfies the quality portion of TECH-DESIGN §12.2 and leaves deployment to later work.
8. **Local hooks/editor policy:** mandatory Husky hooks and/or a committed `.editorconfig`. **Recommendation:** no mandatory hooks; include a small `.editorconfig` only if the proposal wants editor behavior to mirror Prettier. Keep CI authoritative and avoid OneDrive-sensitive hook installation.

## Recommendation

Use **Approach A**: ESLint flat configuration with `typescript-eslint` and Next.js-compatible support, Prettier for formatting, and Vitest for both `apps/web` and `apps/api`. Keep the existing npm workspaces, Node/npm pins, CommonJS API, strict TypeScript base, and no-task-runner policy. Expand `packages/config` with shared quality policy, add per-app scripts and minimal executable baseline tests, and expose root commands that run required app gates without shell-specific composition.

Make CI a GitHub Actions quality workflow on Linux with one immutable install and ordered lint, format-check, typecheck, test, and build steps. Keep coverage report-only or absent, with no threshold. Preserve `ci:check`'s install semantics unless the proposal explicitly defines a compatible replacement; the workflow itself should call the gates individually rather than hiding failures behind a composite shell command. The proposal should resolve the open choices above and state how required app scripts are prevented from being silently skipped.

## Risks

- **Next.js 16 lint compatibility:** Next.js/ESLint integration and the flat-config shape may change across compatible releases; direct CLI execution and the chosen `eslint-config-next` version need a real build/lint validation.
- **NestJS syntax and CJS:** decorator metadata, CommonJS module resolution, and type-aware lint rules can require parser or rule exceptions. The quality configuration must not force item #3 operational changes into the skeleton.
- **False-positive test coverage:** a runner configured to pass with no tests would satisfy CI while proving nothing. Each current app needs a minimal executable baseline, while later features own meaningful domain coverage.
- **Silent workspace skips:** the existing `--if-present` pattern is safe for the dependency-free placeholder but unsafe for required quality gates. Missing app scripts must fail explicitly or be covered by an equivalent root command.
- **Windows/Linux divergence:** PowerShell, CMD, and Bash operators or environment-prefix syntax would violate the established npm-syntax-only constraint. CI should run Linux while local commands remain unchanged on Windows.
- **Pinned toolchain drift:** `.nvmrc` and `packageManager` pin Node 24/npm 12, but the CI runner must explicitly honor both before `npm ci`; otherwise lockfile behavior can differ from local verification.
- **OneDrive and hooks:** synchronized folders can amplify `node_modules`, coverage, and hook churn. Keep generated outputs ignored and avoid mandatory hook installation in this item.
- **CI cost and feedback time:** serial checks are simple and deterministic but can consume minutes; parallel jobs or caching can be reconsidered after the baseline is reliable, without adding a task runner prematurely.
- **Premature coverage thresholds:** a percentage imposed before feature tests exist can encourage low-value tests and block later scaffolding. Thresholds should follow measured domain risk.
- **Scope leakage:** API foundation, Prisma, OpenAPI, deployment, and feature tests could be pulled into quality setup. The item should change only tooling, scripts, baseline tests, and quality automation.

## Ready for Proposal

**Yes.** The current workspace, accepted design constraints, archived item #1 decisions, existing capability spec, and quality-related gaps are sufficiently known. Proceed to `sdd-propose`; require it to resolve the eight open decisions, preserve the npm-only cross-platform boundary, modify only the workspace-quality behavior, and keep items #3+ out of scope.
