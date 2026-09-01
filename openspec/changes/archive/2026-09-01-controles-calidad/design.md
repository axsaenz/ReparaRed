# Design: Quality Controls

## Technical Approach

Add shared lint/format policy, app tests/typechecks, npm gates, and sequential GitHub CI. Current code is Next TSX, Nest/Fastify decorators/CJS, and strict shared TS. Verified 2026-09-01: ESLint `10.9.1`, typescript-eslint `8.69.0`, eslint-config-next `16.3.4`, Prettier `3.9.6`, Vitest `4.1.11`; ranges are `^10.9.1`, `^8.69.0`, `^16.3.4`, `^3.9.6`, `^4.1.11`.

## Architecture Decisions

| Decision         | Choice                                                                                                                                      | Alternative rejected                           | Rationale                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| ESLint           | Root flat config imports `@repara/config/eslint`; Next arrays are web-scoped; API gets a parser override.                                   | Oxlint, legacy config, type-aware API rules    | Next 16.3.4 supports ESLint `>=9`; parser handles decorators and `tsc` owns CJS types. |
| Formatter        | Root `.prettierrc.json` (`singleQuote`, `semi`, `trailingComma: all`) plus identical package export.                                        | Biome/per-app formatters                       | Matches current style with one policy.                                                 |
| Tests            | Vitest `run`, Node in both; web checks `metadata`/component function; API checks `new AppController().getRoot()` equals `{ status: 'ok' }`. | jsdom, Testing Library, Supertest, Nest module | No DOM/server/service dependency; `passWithNoTests: false`.                            |
| Required fan-out | Only `@repara/web` and `@repara/api`; config is linted via web, all packages formatted, no package scripts required.                        | `--if-present` for required gates              | npm reports missing scripts non-zero.                                                  |

Composition: `packages/config/eslint.mjs` exports typescript-eslint’s recommended array; root spreads it, imports Next flat arrays, scopes them to `apps/web/**/*.{ts,tsx}`, ignores outputs, and adds API `sourceType: 'module'` without `parserOptions.project`. Scripts run `eslint --config ../../eslint.config.mjs .`; web also passes `../../packages/config`.

## Interfaces / Contracts

Required app scripts are `lint`, `typecheck`, `test`, `build`; commands are `vitest run` and `tsc --noEmit -p tsconfig.json` (web already noEmit; CLI overrides API outDir); gates start no server.

## Root Orchestration

```json
"lint": "npm run lint --workspace=@repara/web --workspace=@repara/api",
"format": "prettier . --write",
"format:check": "prettier . --check",
"typecheck": "npm run typecheck --workspace=@repara/web --workspace=@repara/api",
"test": "npm run test --workspace=@repara/web --workspace=@repara/api",
"build": "npm run build --workspace=@repara/web --workspace=@repara/api",
"build:web": "npm run build --workspace=@repara/web",
"build:api": "npm run build --workspace=@repara/api",
"ci:check": "npm ci"
```

Explicit app build fan-out makes omissions fail; dependency-free packages need no build script. `.prettierignore` excludes `node_modules/`, `.next/`, `dist/`, `package-lock.json`, `coverage/`, and `*.tsbuildinfo`.

## CI Workflow

```yaml
name: quality
on:
  push:
    branches: [main]
  pull_request:
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - name: Pin npm 12
        run: npm install --global npm@12.0.1
      - name: Install
        run: npm ci
      - name: Lint
        run: npm run lint
      - name: Format check
        run: npm run format:check
      - name: Typecheck
        run: npm run typecheck
      - name: Test
        run: npm test
      - name: Build
        run: npm run build
```

No deployment/secrets. `.editorconfig`: `root = true`; `[*]` sets UTF-8, LF, final newline, spaces, size 2, and `trim_trailing_whitespace = true`; `[*.md]` sets it false.

## Dependency Classification

| Manifest            | New devDependency                                                                                                     | Purpose                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| root `package.json` | `eslint: ^10.9.1`, `typescript-eslint: ^8.69.0`, `eslint-config-next: ^16.3.4`, `prettier: ^3.9.6`, `vitest: ^4.1.11` | Central quality toolchain; zero runtime dependencies. |

## Data Flow

`source → npm workspace script → shared config/runner → non-zero failure or pass → root gate → CI sequential job`.

## File Changes

| Action | Paths                                                                                                                                                                                                                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Create | `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.editorconfig`, `.github/workflows/quality.yml`, `packages/config/{eslint.mjs,prettier.mjs}`, `apps/web/vitest.config.mts`, `apps/web/src/app/layout.test.tsx`, `apps/api/vitest.config.mts`, `apps/api/src/app.controller.spec.ts` |
| Modify | `package.json`, `package-lock.json`, `apps/{web,api}/package.json`, `packages/config/package.json`, `.gitignore` (lint cache/coverage)                                                                                                                                                           |

## Testing Strategy

S1–S2: `npm run lint`; temp violation non-zero, then revert. S3–S4: `npm run format`/`format:check`; temp drift rewrites/fails, excluded outputs pass. S5–S6: `npm run typecheck`; temp error non-zero, then revert. S7–S8: `npm test`; remove/empty baseline => failure. S9–S10: root gates; remove required script => missing-script failure. S11–S12: `npm exec prettier -- --check .github/workflows/quality.yml` plus ordered-step assertion; reorder/deployment => failure. S13–S14: `npm ci` plus manifest/lock inspection; runtime declaration/stale lock => failure. S15–S16: `git check-ignore` generated/planning paths; remove ignore => failure. No server, browser, coverage, or service.

## Threat Matrix

| Boundary                   | Status, safe/failure behavior, planned RED                                                                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm shell-command boundary | **Applicable**: npm flags only; missing scripts fail non-zero. RED: remove/replace a required script and run the root gate.                                                 |
| CI definition              | **Applicable**: inert YAML is only statically checked here; invalid order/deployment fails validation. RED: reorder or add deployment.                                      |
| Commit state               | **Applicable at apply**: one staged intended change set, no generated output; unstaged/missing files fail the apply gate. RED: attempt the commit with an incomplete index. |
| Documentation-like paths   | **N/A** — Markdown/YAML are not executed or classified as commands.                                                                                                         |
| Git repository selection   | **N/A** — no `git -C` or path-selection automation.                                                                                                                         |
| Push state                 | **N/A** — no push automation.                                                                                                                                               |
| PR commands                | **N/A** — no PR command composition.                                                                                                                                        |

## Migration / Rollout

Additive tooling only; no data migration or flags. Roll out as one commit and revert that commit to roll back.

## Open Questions

None.
