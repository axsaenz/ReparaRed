# Pre-Proposal State — gentle-ai.sdd-preproposal/v1

- revision: 1
- status: confirmed
- exploration: `openspec/changes/contrato-openapi/exploration.md`
- research: unselected
- proposal_ready: true
- confirmed_by: orchestrator (auto mode mandate 2026-09-01 — recommended options auto-selected)

## Confirmed product decisions

| # | Decision | Confirmed value |
|---|----------|-----------------|
| 1 | contract_source | `nest-generated-metadata` — @nestjs/swagger decorators on concrete DTO/schema classes + offline export from createApp() boot (no listener, no DB) → committed `apps/api/openapi.json` (binding direction per ADR-0005) |
| 2 | health_scope | `all-public-paths` — document `/`, `/health/live`, `/health/ready` as tagged unversioned system operations (200 minimal + 503 problem for ready); full path names, no fake /api/v1 health |
| 3 | client_shape | `typed-fetch-client` — packages/api-client = generated types (openapi-typescript) + small typed openapi-fetch factory accepting base URL/fetch/headers from the BFF; NO cookies/session/token/business logic; ADR-0011 BFF boundary preserved |
| 4 | generated_artifacts | `commit-and-verify` — commit openapi.json + generated client source; CI fails if tracked artifacts are stale after deterministic regeneration |
| 5 | compatibility_gate | `openapi-diff-semantic` — openapi-diff base-vs-current in CI (breaking fails, additive allowed in v1 per locked compat rule) + generated-artifact diff; FIRST-BASELINE behavior explicit (skip comparison with recorded baseline note when base doc absent; generation/validation/compilation still mandatory) |
| 6 | tool_versions | `exact-direct-pins` — @nestjs/swagger 12.0.1 (apps/api RUNTIME dep — decorators emit imports), openapi-typescript 7.13.0, openapi-diff 0.24.1, @apidevtools/swagger-parser 12.1.0 (dev tooling), openapi-fetch 0.17.0 (packages/api-client runtime dep); exact pins in lockfile, deliberate upgrades |

## Locked conventions (binding, verbatim from ADR-0003/0005/0011 + TECH-DESIGN §3.4/§7.x)

- Versioned OpenAPI contract = source of truth; web consumes REST/HTTPS JSON; CI verifies published vs consumed spec for incompatibilities (ADR-0003).
- NestJS generates and publishes the agreed contract (ADR-0005). Prisma entities NEVER shared as frontend contract; OpenAPI is the app boundary (TD §3.4). Contract names freeze in OpenAPI before web implementation (TD §7.2).
- BFF: explicit Next.js adapters consume the contract + forward short-lived bearer; no browser-to-API client, no generic proxy (ADR-0011).
- Conventions: base path /api/v1; camelCase JSON UTF-8; opaque string IDs; RFC 3339 with offset (UTC persisted, America/Lima presentation); money {amount:"125.50",currency:"PEN"}; pagination page≥1, limit default 20 max 100 (reusable schema — NOT added to catalog endpoints); stable ordering + id tie-break; problem+json envelope (type urn:reparared:error:{CODE}, title, status, detail, code, traceId, fieldErrors?) with the 9 stable codes; status semantics 401/403/404/409/422/429/503 locked.
- Compatibility rule: additive stays in v1; removals/semantic changes/optional→required need new version or coordinated migration.

## Capability impact (binding)

NEW capability `openapi-contract` (contract publication, client generation, CI compatibility detection, offline export discipline). No modifications to existing capabilities (catalog/health/problem semantics unchanged — documented, not altered).

## Scope boundary (binding)

IN: DTO/schema classes + swagger metadata for the CURRENT surface (categories, districts, root, health), problem/envelope/money/timestamp/pagination shared schemas (pagination as reusable component only), offline export script + regression test, committed openapi.json, packages/api-client generated types + typed factory + package wiring (types/main/exports + typecheck/build), root scripts (contract:export, contract:generate, contract:validate, contract:check stale, contract:diff), CI step after Test before Build (Node orchestration, cross-platform), first-baseline handling, tests. OUT: new business endpoints, auth/BFF/UI wiring (#12/#13/#18+), Swagger UI hosting, deploy, runtime client usage in web pages, semantic changes to existing behavior.

## Carried forward (binding)

Live PostgreSQL gate remains UNSATISFIED (migrations #1–#5 + seed + triggers/concurrency) — orthogonal to this change but unchanged. Contract work is fully offline-verifiable (export boots DB-free).
