## Exploration: Automate the OpenAPI contract

### Current State

The checkout contains the implemented monorepo scaffold even though `openspec/config.yaml` still describes a planning-only workspace. The API has two business endpoints: `GET /api/v1/categories` and `GET /api/v1/districts`. Both are declared by the root `@Controller()` and receive `/api/v1` from `createApp()`; both return the concrete envelope `{ data: [...] }`. Categories expose `id`, `slug`, and `name`. Districts expose `id`, `ubigeoCode`, `name`, `province`, and `department`. The optional `active` query accepts omission or the string `true`; `false` is rejected as semantic input and other values as invalid input.

The global `ProblemDetailsFilter` already emits `application/problem+json` with `type`, `title`, `status`, `detail`, `code`, `traceId`, and optional `fieldErrors`; `type` is deterministic as `urn:reparared:error:{CODE}`. `PROBLEM_DEFINITIONS` and the API-foundation specification provide the stable codes `INPUT_INVALID` (400), `AUTHENTICATION_REQUIRED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `SEMANTIC_INVALID` (422), `RATE_LIMITED` (429), `DEPENDENCY_UNAVAILABLE` (503), and `INTERNAL_ERROR` (500). Existing in-process integration tests verify catalog envelopes, content types, error mapping, trace correlation, and the absence of sensitive persistence details.

`GET /`, `GET /health/live`, and `GET /health/ready` are intentionally unversioned. The root and live responses are `{ status: "ok" }`; readiness can return the same response or a safe 503 problem. The database client is lazy: `PrismaService` constructs a client without connecting, and the health database query is invoked only by the readiness request. Existing `createApp()` plus `app.init()` tests run without a listener, database URL, or external service, so an offline export mode is feasible but must be protected by a regression test.

There is no OpenAPI document, Swagger metadata, export script, generator script, or generated client today. `packages/api-client` is a dependency-free CommonJS stub whose `index.js` exports `{}`. The root already has npm quality gates, `.nvmrc` pins Node `24.15.0`, and `.github/workflows/quality.yml` runs `npm ci`, lint, format check, typecheck, tests, and build sequentially. The workflow is the direct CI extension point; no contract step exists yet.

The accepted documents bind the direction. The relevant decisions are:

> “La aplicación web consumirá una API REST sobre HTTPS, con cuerpos JSON y un contrato OpenAPI versionado como fuente de verdad.” (ADR-0003)

> “La especificación publicada por la API y la versión consumida por la web se verificarán en integración continua para detectar cambios incompatibles.” (ADR-0003)

> “NestJS generará y publicará el contrato OpenAPI acordado.” (ADR-0005)

> “No se compartirán entidades Prisma como contrato de frontend. OpenAPI es la frontera entre aplicaciones.” (TECH-DESIGN.md §3.4)

> “Los nombres finales del contrato se congelarán en OpenAPI antes de implementar la web.” (TECH-DESIGN.md §7.2)

The compatible interpretation is to version the exported OpenAPI document as the consumer source of truth while generating it from explicit NestJS DTO/schema metadata. No ADR fixes a particular Swagger, client-generation, compatibility, or document-format tool. ADR-0008 fixes the deployment gate ordering but does not add a separate contract mechanism. ADR-0011 requires explicit Next.js BFF adapters to consume the contract and forward a short-lived bearer token; it does not authorize a browser-to-API client or a generic proxy.

The locked API conventions are:

> “Base path: `/api/v1`.”

> “JSON en `camelCase` y UTF-8.”

> “Identificadores opacos como cadenas.”

> “Fechas y horas como RFC 3339 con offset; persistencia UTC y presentación `America/Lima`.”

> “Dinero como `{ "amount": "125.50", "currency": "PEN" }`.”

> “Paginación por página: `page` desde 1, `limit` por defecto 20 y máximo 100.”

> “Listas con orden estable y desempate por identificador.”

> “Errores `application/problem+json` con `type`, `title`, `status`, `detail`, `code`, `traceId` y errores por campo opcionales.”

> “`401` para sesión ausente/inválida, `403` para acción prohibida, `404` cuando no corresponde revelar existencia, `409` para estado o concurrencia incompatible, `422` para datos inválidos, `429` para límite y `503` para dependencia no disponible.”

Compatibility is also locked: additive changes may remain in `v1`; removing fields, changing semantics, or making an optional field required needs a new version or coordinated migration. The current catalogs are not paginated; the page/limit convention must be reusable for later request, quote, and service lists without inventing pagination metadata for these two endpoints.

Read-only registry checks on 2026-09-01 observed `@nestjs/swagger` 12.0.1, `openapi-typescript` 7.13.0, `@asteasolutions/zod-to-openapi` 9.1.0, and `swagger-ui-express` 5.0.1. `@nestjs/swagger` matches the current Nest 12 line and its `@fastify/static` peer is optional. `openapi-typescript` is a TypeScript 5 CLI. Zod-to-OpenAPI is not relevant because the API uses Nest/Joi rather than Zod. Swagger UI Express requires Express and is not needed for this Fastify API. Additional read-only checks found `openapi-fetch` 0.17.0, `openapi-diff` 0.24.1 (Node >=18, CLI/API, breaking changes produce a non-zero result), and `@apidevtools/swagger-parser` 12.1.0.

### Affected Areas

- `apps/api/src/catalogs/catalogs.controller.ts` and new API DTO/schema classes — add explicit Swagger metadata; TypeScript interfaces are erased and cannot reliably describe reusable OpenAPI schemas.
- `apps/api/src/app.controller.ts` and `apps/api/src/health/health.controller.ts` — document the current unversioned system paths if health is included; do not change their runtime behavior.
- `apps/api/src/common/errors/problem-details.ts` and/or a documentation DTO module — expose the existing problem shape and exact error-code enum without sharing Prisma entities or weakening the filter.
- `apps/api` OpenAPI bootstrap/export script and a committed `openapi.json` (recommended location) — boot `createApp()` offline, call `SwaggerModule.createDocument()`, validate the document, and close the app without listening or invoking health/catalog requests.
- `packages/api-client` — replace the stub with committed generated OpenAPI types and a package-owned typed client entry point; wire `types`, `main`, `exports`, and any package build/typecheck needed to make the generated client consumable by future BFF code.
- Root and workspace `package.json` plus `package-lock.json` — add exact, intentionally upgraded contract-tool versions and cross-platform scripts for export, client generation, validation, stale-artifact detection, and compatibility comparison. `@nestjs/swagger` belongs with the API runtime because controller decorators are emitted imports; generator/diff/validation tools are development tooling; `openapi-fetch` is a runtime dependency of the client package if the typed fetch shape is selected.
- `.github/workflows/quality.yml` — add the contract gate after tests and before build, preserving the existing sequential quality order. Pull requests need the base ref/spec available for compatibility comparison; pushes must at least verify deterministic generated artifacts.
- API and contract tests — assert exact paths, shared schemas, current catalog response shapes, problem responses, unversioned health behavior, offline export, generated-client compilation, stale generated-file failure, and breaking/non-breaking compatibility cases.
- `.gitignore` and formatter/linter scope — keep the published OpenAPI JSON and generated client source trackable; ignore only build output and temporary comparison files. Generated output must not silently disappear from a clean checkout.

No database migration, new domain endpoint, authentication flow, BFF route, web page, deployment configuration, or runtime Swagger UI is required for this item.

### Approaches

1. **NestJS-generated contract plus generated typed client (recommended)** — decorate concrete controller DTOs and responses with `@nestjs/swagger`, export a document from an offline Nest bootstrap, validate it, run `openapi-typescript`, and expose the generated types through a typed `openapi-fetch` factory in `packages/api-client`. Compare the current committed document with the base document using `openapi-diff` in CI.
   - Pros: follows ADR-0005 directly; keeps documented routes and DTO metadata close to code; makes the exported document and generated client reviewable; offline boot is already supported by the lazy database foundation; compatibility is classified rather than inferred from a text diff.
   - Cons: requires DTO classes and decorators because current response interfaces are erased; adds export/bootstrap and package build wiring; reflection or decorator changes can cause generated-document churn; `@nestjs/swagger` becomes an API runtime dependency.
   - Effort: Medium.

2. **Hand-authored design-first OpenAPI document plus generator** — maintain `openapi.yaml` or JSON as the primary contract, generate `openapi-typescript` output from it, and separately test the Nest routes against the document.
   - Pros: deterministic and independent of Nest boot or database configuration; explicit schemas are easy to review; no controller decorator coupling.
   - Cons: duplicates paths and schemas already implemented in controllers; code/spec drift is possible; validating that runtime Nest behavior matches the hand-authored document requires custom checks or a second generated runtime document; it is less aligned with “NestJS generará y publicará el contrato acordado.”
   - Effort: Medium initially, High to make drift detection trustworthy.

### Recommendation

Use Approach 1. Treat the committed `apps/api/openapi.json` as the versioned consumer artifact and the Nest decorators/DTOs as its generation input. Generate `packages/api-client/src/generated.ts` with `openapi-typescript`, then export a small typed `openapi-fetch` factory that accepts the BFF-provided base URL, `fetch` implementation, and request headers. The package must not read cookies, own session state, expose tokens to browser code, or implement authorization/business rules. A generated-types-only package is smaller, but it would not fully satisfy the downstream requirement that the web consume a generated client; the typed fetch factory adds only transport typing and preserves ADR-0011’s explicit BFF boundary.

The document should include the current catalog paths and reusable `Category`, `District`, concrete data-envelope, `ProblemDetails`, `fieldErrors`, error-code, bearer-security, money, and timestamp schemas. It should include `/`, `/health/live`, and `/health/ready` as unversioned, unauthenticated system paths so the published document does not leave an externally reachable API surface undocumented; use a root server URL and full path names rather than pretending health is under `/api/v1`. Readiness documents its 200 minimal response and 503 problem response. Do not add future logical resources from TECH-DESIGN.md §7.2 until their backlog items implement them, and do not add Swagger UI hosting.

Generated JSON and client source should be committed. CI should run a deterministic export and generation, fail if tracked artifacts change, validate the resulting OpenAPI document, and on pull requests compare the base-branch document with the current document using `openapi-diff`. Breaking changes fail the gate; additive changes remain allowed in `v1` as specified. If the base branch has no prior document during this first adoption, the compatibility comparison may report an explicit first-baseline skip, while generation, validation, and client compilation remain mandatory. Exact direct-tool versions should be recorded in the lockfile and upgraded deliberately to limit generator churn.

The contract gate belongs after the existing `Test` step and before `Build`. A Node-based orchestration script is preferable to shell-specific `&&`, path, and temporary-file commands because local development is Windows/PowerShell while CI is Ubuntu. The offline exporter must unset or ignore database configuration for its mode, call `app.init()` only, assert that no listener or external request is opened, and close the app in a `finally` path. Existing lazy Prisma and in-process tests provide the foundation, but a dedicated export test is still required to guard future modules.

#### Boundary analysis

**In scope:** publish the locked API conventions; document the two catalog endpoints and shared problem/data schemas; generate the TypeScript client into `packages/api-client`; validate generated output and compile it; detect stale and incompatible contract changes in CI; add offline-verifiable contract/export tests.

**Out of scope:** new business endpoints; registration/authentication and authorization flows; BFF or UI wiring for #12, #18, and later consumers; request/image/service behavior; deployment and migration release jobs; runtime client usage in web pages; Swagger UI hosting; changing the existing error, health, or catalog semantics.

#### Open decisions for proposal

| Decision | Options | Recommendation |
|---|---|---|
| Contract source | Nest-generated metadata; hand-authored document | Nest-generated metadata, with committed exported JSON, because ADR-0005 is binding. |
| Health scope | Business paths only; all current public paths | Include root and both health paths as tagged system operations. |
| Client shape | Generated types only; typed fetch client | Generated types plus `openapi-fetch` factory, with no session logic. |
| Generated artifacts | Ignore and regenerate; commit and verify | Commit the document and generated client; CI fails on stale output. |
| Compatibility gate | Text diff; semantic base/current diff | `openapi-diff` for breaking changes plus a targeted generated-artifact diff. |
| Tool versions | Ranges; exact direct pins | Exact direct pins for generators/diff/validator; upgrade intentionally. |

### Risks

- An exporter can accidentally invoke a database or another provider if a future module adds eager initialization; enforce the no-DB/no-listener test and keep export separate from health/catalog requests.
- Swagger reflection cannot infer erased interfaces or generic envelopes; concrete DTO/schema classes and targeted document assertions are required, without reusing Prisma models.
- Decorator or tool upgrades can reorder schemas or alter output; stable serialization, exact pins, and committed-artifact checks reduce unexplained churn.
- A base-branch document may be absent during first adoption or unavailable with shallow checkout; CI must handle the first baseline explicitly and fetch the pull-request base deterministically.
- `openapi-diff` classifies supported changes, but unclassified differences still need an explicit review policy rather than being silently accepted.
- Express-oriented Swagger UI examples are unsafe for this Fastify stack; use document creation only and keep `swagger-ui-express` out of the change.
- Adding future endpoints, auth models, or BFF adapters while decorating the current surface would violate item #10’s boundary.
- The OpenSpec testing-discovery metadata is stale relative to the actual apps; this is maintenance debt, not a reason to expand this contract change.

### Ready for Proposal

Yes. The accepted contract, current runtime surface, offline boot constraint, client home, CI insertion point, and recommended generation/compatibility architecture are sufficiently clear for a proposal. The orchestrator should adopt the recommendations above, state the first-baseline behavior explicitly, and keep the proposal limited to item #10.
