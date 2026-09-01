# Proposal: Implement BACKLOG.md item #2: Quality controls

## Intent

Wire lint, format, typecheck, tests, and reproducible CI/build gates into the monorepo so quality failures are visible locally and in CI, per BACKLOG item #2 and TECH-DESIGN §12.2.

## Scope

### In Scope

- Dev-only quality tooling, shared policy, per-app scripts/configuration, and runnable baseline tests.
- Root npm workspace gates, immutable lockfile updates, `.editorconfig`, and generated-output ignores.
- One sequential Ubuntu GitHub Actions quality job: install, lint, format check, typecheck, test, build.

### Out of Scope

- Business logic, feature/domain/integration/e2e tests, coverage instrumentation or thresholds, and runtime dependencies.
- Item #3 API foundation, Prisma/item #4, OpenAPI/client item #10, deployment/item #11, task runners, and mandatory git hooks.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `monorepo-workspace`: add required lint, format, typecheck, test, build, and reproducible CI quality-gate behavior while preserving npm workspaces, Node/npm pins, CommonJS API output, and cross-platform scripts.

## Approach

- Use ESLint flat config (ESLint `v9.x`, `typescript-eslint` `v8.x`) with Next.js 16-compatible `eslint-config-next`; keep shared policy in `packages/config` with narrow app overrides. Add Prettier `v3.x`.
- Add Vitest (current stable major) to both apps with per-app configs: Node for API; the lightest web environment that renders the baseline test, using jsdom-equivalent only if required. Tests remain unit-level: web page/metadata sanity; API `AppController` returns `{status: "ok"}` by direct instantiation, with no Supertest/server.
- Add root `lint`, `format`, `format:check`, `typecheck`, `test`, and `build` scripts using npm workspace flags only; required app gates omit `--if-present`.
- Add `.github/workflows/quality.yml` with `setup-node`, `node-version-file: .nvmrc`, npm 12/packageManager alignment, and ordered `npm ci` → lint → format:check → typecheck → test → build.

## Affected Areas

| Area                                                                                         | Impact       | Description                                             |
| -------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------- |
| `package.json`, `package-lock.json`                                                          | Modified     | Dev dependencies and root gates.                        |
| `eslint.config.mjs`, `.prettierrc*`, `.prettierignore`, `.editorconfig`, `.gitignore`        | New/Modified | Root policy, editor settings, generated-output ignores. |
| `.github/workflows/quality.yml`                                                              | New          | Static CI quality pipeline.                             |
| `packages/config/package.json`, `packages/config/eslint.mjs`, `packages/config/prettier.mjs` | Modified/New | Shared quality policy, retaining TypeScript base.       |
| `apps/web/package.json`, `apps/web/vitest.config.*`, web test, lint override                 | Modified/New | Web gates and baseline test.                            |
| `apps/api/package.json`, `apps/api/vitest.config.*`, API test                                | Modified/New | API gates and baseline test.                            |

## Risks

| Risk                                   | Likelihood | Mitigation                                                                   |
| -------------------------------------- | ---------- | ---------------------------------------------------------------------------- |
| Next.js 16/ESLint incompatibility      | Med        | Validate compatible config before finalizing rules.                          |
| Decorators/CJS versus type-aware rules | Med        | Use parser-aware, narrow API overrides; preserve `tsc` output.               |
| Silent skips or empty assurance        | Med        | Required scripts omit `--if-present`; execute one test per app.              |
| Windows/Linux divergence               | Med        | Use npm syntax only and validate commands on Windows/Ubuntu assumptions.     |
| CI toolchain drift                     | Med        | Honor `.nvmrc`, engines, and `packageManager`; retain lockfile and `npm ci`. |
| Scope leakage                          | Med        | Exclude later capabilities, hooks, coverage thresholds, and runtime changes. |

## Rollback Plan

All changes are additive tooling plus one workflow file. Revert the single commit; quality gates are non-runtime, so app builds remain unaffected by their removal.

## Dependencies

- Item #1 archived capability and its accepted ADR constraints; no external services.
- GitHub Actions cannot be executed locally without a GitHub remote. Verify YAML and step order statically; verify all underlying npm commands locally on Windows.

## Success Criteria

- [ ] `npm run lint`, `format:check`, `typecheck`, and `build` exit 0; `npm run test` has at least one passing test per app.
- [ ] Workflow YAML is valid and follows TECH-DESIGN §12.2 quality order.
- [ ] Dependencies are dev-only, lockfile is committed, `npm ci` is clean, and generated outputs are ignored.
