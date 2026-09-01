# Pre-Proposal State — gentle-ai.sdd-preproposal/v1

- revision: 1
- status: confirmed
- exploration: `openspec/changes/controles-calidad/exploration.md`
- research: unselected
- proposal_ready: true
- confirmed_by: orchestrator (auto mode mandate 2026-09-01 — recommended options auto-selected)

## Confirmed product decisions

| #   | Decision       | Confirmed value                                                                                                                                                                                                                                                             |
| --- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | lint_tool      | `eslint-flat-config` — ESLint flat config + typescript-eslint + Next.js-compatible support; shared policy in `packages/config`, narrow per-app overrides                                                                                                                    |
| 2   | formatter      | `prettier` (dedicated formatter; not Biome)                                                                                                                                                                                                                                 |
| 3   | test_runner    | `vitest-both-apps` — Vitest in apps/web and apps/api; node environment for API tests; per-app config                                                                                                                                                                        |
| 4   | baseline_tests | `minimal-runnable-tests` — at least one executable baseline test per app skeleton; no passWithNoTests-only suites                                                                                                                                                           |
| 5   | coverage       | `deferred` — no coverage instrumentation or thresholds in item #2 (no domain tests exist yet)                                                                                                                                                                               |
| 6   | orchestration  | `root-npm-scripts` — root commands `lint`, `format`, `format:check`, `typecheck`, `test`, `build` fanning out via npm workspace flags; npm-syntax-only (no shell operators); required app gates must NOT use `--if-present` (missing required scripts must fail explicitly) |
| 7   | ci             | `github-actions-quality` — `.github/workflows/quality.yml`, one Ubuntu job, pinned Node 24 + npm 12, ordered steps: `npm ci` → lint → format:check → typecheck → test → build; no deploy jobs                                                                               |
| 8   | hooks_editor   | `no-hooks-yes-editorconfig` — no Husky/pre-commit hooks; small `.editorconfig` mirroring Prettier basics                                                                                                                                                                    |

## Binding constraints carried from item #1 (do not revisit)

npm workspaces; no task runner; Node 24 LTS pins (.nvmrc/engines/packageManager); CommonJS API compiled by tsc; cross-platform npm-syntax-only scripts; immutable lockfile (`npm ci`); `packages/config` as shared-config home; placeholder `packages/api-client` stays dependency-free.

## Scope boundary (binding)

IN: dev-only quality deps, shared lint/format policy in packages/config, per-workspace quality scripts, standalone typecheck, baseline runnable tests, CI quality workflow, .editorconfig, ignore rules for generated output. OUT: business logic, item #3 API foundation (env validation, uniform errors, logs, health), item #4 Prisma, item #10 OpenAPI/client, item #11 deploy, coverage thresholds, mandatory git hooks.
