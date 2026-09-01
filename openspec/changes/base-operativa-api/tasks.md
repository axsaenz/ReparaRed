# Tasks: API Operational Foundation

## Review Workload Forecast
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Estimated authored changes: 460–540 lines across ~18 small source/test files; manifest/lockfile generated bulk excluded.  Delivery strategy: ask-on-risk. Suggested split: PR 1 → PR 2 → PR 3 → PR 4; strategy decision required before apply.

### Suggested Work Units
| Unit | Goal | PR | Focused test | Runtime harness | Rollback |
|---|---|---|---|---|---|
| 1 | Dependencies/config | PR 1 | `npm --workspace apps/api test -- env.schema.spec.ts` | PowerShell invalid/default/unknown boot | config/manifests |
| 2 | Correlation/errors/logging | PR 2 | `npm --workspace apps/api test -- trace-id problem-details.filter pino-options` | `Fastify inject()` 404 + captured logs | common/wiring |
| 3 | Health/integration | PR 3 | `npm --workspace apps/api test -- health.controller app.integration` | `Fastify inject()` offline/no listener | health/app/tests |
| 4 | Quality/release | PR 4 | `npm test` | N/A — quality/index only | whole change |

## Phase 1: Dependencies + config foundation
- [x] 1.1 Add `@nestjs/config ^12.0.0`, `joi ^18.2.5`, `pino ^10.3.1`, `nestjs-pino ^5.0.0`, `pino-http ^11.0.0`, and `@nestjs/terminus ^12.0.0` to `apps/api/package.json`; root `npm install` refreshes `package-lock.json`; add no dev dependencies.
- [x] 1.2 Create `apps/api/src/config/env.schema.ts`, `apps/api/src/config/app-config.service.ts`, `apps/api/src/config/config.module.ts`, and optional non-secret `apps/api/.env.example` with Joi defaults/bounds, consumed-key validation, and unknown-key allowance.
- [x] 1.3 Boot-gate invalid `PORT` before listen; PowerShell `$env:` checks cover invalid/default/valid/unrelated env, safe output, and no values printed.

## Phase 2: Correlation + errors + logging
- [x] 2.1 Create `apps/api/src/common/request/trace-id.ts` and `apps/api/src/common/request/fastify-hooks.ts` for bounded IDs, `genReqId`, decoration, and header echo.
- [x] 2.2 Create `apps/api/src/common/errors/problem-details.ts` and `apps/api/src/common/errors/problem-details.filter.ts` with all 400/401/403/404/409/422/429/503/500 mappings, deterministic URIs, sorted fields, and safe details.
- [x] 2.3 Create `apps/api/src/common/logging/pino-options.ts` with `reparared-api`, normalized env, required fields, query/body omission, and sensitive redaction.
- [x] 2.4 Create `apps/api/src/app.factory.ts` and wire `apps/api/src/app.module.ts`/`apps/api/src/main.ts`: config, logger bridge, `api/v1` exclusions, global filter, typed `HOST`/`PORT`.

## Phase 3: Health
- [x] 3.1 Create `apps/api/src/health/health.module.ts`, `apps/api/src/health/health.controller.ts`, and `apps/api/src/health/foundation.indicator.ts` for dependency-free liveness, app-only readiness, minimal JSON, safe 503, and ordered #4 extension point.

## Phase 4: Tests
- [x] 4.1 Add `apps/api/src/config/env.schema.spec.ts` and `apps/api/src/common/request/trace-id.spec.ts` for defaults, aborts, unknown keys, valid IDs, and malformed/control/oversized IDs.
- [x] 4.2 Add `apps/api/src/common/errors/problem-details.filter.spec.ts`, `apps/api/src/common/logging/pino-options.spec.ts`, and `apps/api/src/health/health.controller.spec.ts` for every mapping, field normalization, captured-writer redaction, and probes.
- [x] 4.3 Add `apps/api/src/app.integration.spec.ts` with `Fastify inject()` only for root/live/ready, unknown 404 content type, trace equality/fallback, and offline startup; update `apps/api/src/app.controller.spec.ts` only if needed. Run workspace `npm test`.

## Phase 5: RED threat gates + quality + commit
- [x] 5.1 RED gate: newline/control/oversized trace inputs generate IDs and never appear raw in captured logs.
- [x] 5.2 RED gate: authorization/cookie/password-like input is absent from captured logs and problem details; examples contain no secrets.
- [x] 5.3 RED gate: inject prefix exclusions and unknown routes; assert correlated problem 404.
- [x] 5.4 Run `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, and `npm run build` across the workspace.
- [x] 5.5 RED commit-state check: stage only intended source/tests/manifests and required lockfile, no incidental generated output; create exactly `chore: add API operational foundation`, never `commit -a` or push, then verify a clean tree.
