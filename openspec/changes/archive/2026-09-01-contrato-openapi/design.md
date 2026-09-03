# Design: OpenAPI Contract

## Technical Approach

Generate versioned OpenAPI from NestJS metadata, commit `apps/api/openapi.json` as source of truth, generate `packages/api-client` typed client via `openapi-typescript` + `openapi-fetch`. Keep export DB-free (`createApp().init()` only) and CI-detect staleness/incompatibilities after `Test`.

## Architecture Decisions

| Decision | Choice | Alternative | Rationale |
|---|---|---|---|
| Generation source | `@nestjs/swagger` decorators on DTOs + `SwaggerModule.createDocument` | Hand-authored openapi.yaml | Follows ADR-0005 binding; code≡contract |
| DTOs | Concrete classes with `@ApiProperty` (not interfaces) | Shared Prisma models | TypeScript interfaces erased; Prisma leakage forbidden |
| System paths | Document `/`, `/health/live`, `/health/ready` as `System` tag | Business only | No undocumented reachable surface |
| Client | `openapi-typescript` types + `openapi-fetch` factory `createClient({baseUrl, fetch, headers})` | Types-only | Satisfies BFF typed fetch without session logic |
| Artifacts | Commit `openapi.json` + `packages/api-client/src/generated.ts` | Ignore & regenerate | Reviewable diff; stale detection via `git diff --exit-code` |
| Compatibility | `openapi-diff` base vs current in CI | Text diff | Semantic breaking vs additive classification |
| Export runner | Node `scripts/export-openapi.mjs` (CommonJS app stays CJS; script uses ESM import of compiled factory) | In-package TS script | Avoids `--experimental-strip-types` on Windows/OneDrive; uses `tsx` fallback documented |

## Data Flow

```
createApp() -> SwaggerModule.createDocument() -> validate(swagger-parser) -> write openapi.json -> close()
openapi.json -> openapi-typescript -> packages/api-client/src/generated.ts -> tsc typecheck
CI: regenerate -> git diff --exit-code (stale) -> swagger-parser validate -> openapi-diff vs base (breaking fails)
```

## File Changes

| Path | Action | Purpose |
|---|---|---|
| `apps/api/src/catalogs/dto/*`, `common/dto/*` | Create | Category/District/DataEnvelope/ProblemDetails/Money/Pagination DTOs with @ApiProperty |
| `apps/api/src/app.factory.ts` (export fn) | Modify | Expose `createAppForExport()` for DB-free document creation |
| `apps/api/scripts/export-openapi.mjs` | Create | Offline export + validation |
| `apps/api/openapi.json` | Create | Committed contract |
| `packages/api-client/src/generated.ts`, `client.ts`, `index.ts` | Create/Modify | Generated types + factory; wire package.json types/main/exports |
| `package.json` root + `apps/api/package.json` + `packages/api-client/package.json` | Modify | Exact pins: @nestjs/swagger 12.0.1 (api runtime), openapi-typescript 7.13.0, openapi-diff 0.24.1, swagger-parser 12.1.0 dev, openapi-fetch 0.17.0 (client runtime); scripts contract:* |
| `.github/workflows/quality.yml` | Modify | Add contract gate after Test before Build |
| `apps/api/src/catalogs/catalogs.controller.spec.ts` (export test) | Create | Regression: export DB-free |

## Interfaces

```ts
// packages/api-client/client.ts
export function createApiClient(opts: { baseUrl: string; fetch?: typeof fetch; headers?: Record<string,string> })
```

## Testing Strategy

| Layer | Proof |
|---|---|
| Export | `node scripts/export-openapi.mjs` twice → byte-identical; no DB env required |
| Schemas | DTO unit asserts shared components exist with locked field names |
| Client | `tsc --noEmit -p packages/api-client/tsconfig.json` passes |
| Stale | `git diff --exit-code` on committed artifacts |
| Compatibility | openapi-diff reported breaking vs additive |

## Threat Matrix

| Boundary | Applicability | RED |
|---|---|---|
| Shell | Applicable: npm contract:* scripts | Assert no credential literals |
| Secrets | Applicable: no DB URL in openapi.json | Scan committed doc |
| Commit | Applicable at apply | Single intended commit |

## Migration / Rollout

One commit; rollback = revert. No data migration.

## Open Questions

None.
