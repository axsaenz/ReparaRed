# Tasks: OpenAPI Contract

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: High

- Estimated authored: ~500 lines (DTOs, export script, generated client wiring, CI step). Delivery: `size:exception` approved — single cohesive unit, no remote chains.

## Phase 1: DTOs & Metadata

- [x] 1.1 Create `apps/api/src/common/dto/problem-details.dto.ts`, `money.dto.ts`, `pagination.dto.ts` with @ApiProperty and locked fields
- [x] 1.2 Create `apps/api/src/catalogs/dto/category.dto.ts`, `district.dto.ts`, `data-envelope.dto.ts` and annotate `catalogs.controller.ts` with @ApiOperation/@ApiResponse

## Phase 2: Export Pipeline

- [x] 2.1 Add `createAppForExport()` to `app.factory.ts` (no DB, no listen, init only, close in finally)
- [x] 2.2 Create `apps/api/scripts/export-openapi.mjs` that boots app, SwaggerModule.createDocument, validates via swagger-parser, writes `openapi.json`

## Phase 3: Client Package

- [x] 3.1 Install exact pins: @nestjs/swagger 12.0.1 (api), openapi-typescript 7.13.0, openapi-diff 0.24.1, swagger-parser 12.1.0 dev, openapi-fetch 0.17.0 (client)
- [x] 3.2 Generate `packages/api-client/src/generated.ts` via openapi-typescript and create typed factory `client.ts` + wire package.json

## Phase 4: CI & Verification

- [x] 4.1 Add npm scripts `contract:export`, `contract:generate`, `contract:validate`, `contract:check`, `contract:diff` (Node orchestration, cross-platform)
- [x] 4.2 Update `.github/workflows/quality.yml` — contract gate after Test before Build (regenerate, stale-check, validate, diff with baseline-skip)
- [x] 4.3 Run quality gates: export determinism, validate, client typecheck, stale-check, lint/format/typecheck/test/build

## Phase 5: Commit

- [x] 5.1 Stage intended files only, commit `chore: automate OpenAPI contract`, verify clean tree
