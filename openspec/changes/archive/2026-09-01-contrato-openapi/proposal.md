# Proposal: Automate the OpenAPI Contract

## Intent

Automate the API contract: NestJS-generated OpenAPI becomes the versioned source of truth, a TypeScript client is generated into `packages/api-client`, and CI detects stale or incompatible changes (ADR-0003/0005; TECH-DESIGN §7.2).

## Scope

### In Scope
- Document the **current** public surface: categories, districts, `/`, `/health/live`, and `/health/ready`; add no endpoints or behavior.
- Add DTO/schema metadata, offline export, committed `apps/api/openapi.json`, generated client, validation, compatibility checks, and tests.
- Add cross-platform Node orchestration and CI contract gating after Test and before Build.

### Out of Scope
- New business endpoints, authentication, authorization changes, BFF/UI wiring, runtime client use, deployment, or Swagger UI.
- Semantic changes to existing catalog, health, or problem behavior.

## Capabilities

### New Capabilities
- `openapi-contract`: published contract, generated client, offline export discipline, and CI drift/compatibility detection.

### Modified Capabilities
- None.

## Approach

- Add concrete DTO/schema classes and `@nestjs/swagger` metadata for `Category`, `District`, `{data:[...]}` envelopes, active query semantics, and 422/400 responses; document root/health system paths and shared `ProblemDetails`, `fieldErrors`, error-code enum, `Money`, RFC 3339 timestamp format, and reusable `Pagination` page/limit components (not applied to catalogs).
- Export by booting `createApp()`, calling `SwaggerModule.createDocument()`, validating with `swagger-parser`, writing `apps/api/openapi.json`, and closing; never listen or use a database. Add a DB-free regression test.
- Generate `openapi-typescript` types and a typed `openapi-fetch` factory accepting BFF-injected base URL/fetch/headers; no cookies, session, tokens, or business logic. Wire `types`/`main`/`exports` and typecheck.
- Add npm-syntax-only Node scripts: `contract:export`, `contract:generate`, `contract:validate`, `contract:check`, `contract:diff`. CI regenerates, stale-checks, validates, and runs semantic base-vs-current `openapi-diff` (breaking fails; additive is allowed in v1). Pin `@nestjs/swagger` 12.0.1 runtime, `openapi-typescript` 7.13.0, `openapi-diff` 0.24.1, `swagger-parser` 12.1.0 dev, and `openapi-fetch` 0.17.0; refresh the lockfile.

**First baseline:** when no base document exists, record an explicit compatibility skip; generation, validation, and client compilation remain mandatory. Later comparisons are semantic.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| Catalog controller/DTOs; app and health controllers | Modified | Contract metadata only. |
| Common documentation module/schemas | New | Problem, money, timestamp, pagination components. |
| Export script and `apps/api/openapi.json` | New | Deterministic DB-free artifact. |
| `packages/api-client/*` | Modified | Generated types and typed factory. |
| Root/API/client manifests, lockfile, `.gitignore`, formatter scope | Modified | Pins, scripts, exports, tracked generated output. |
| API/client tests; `.github/workflows/quality.yml` | Modified | Offline guards and ordered CI gate. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Eager future module initialization breaks offline export | Med | DB-free regression test and guaranteed close. |
| Decorator churn or erased interfaces | Med | Exact pins, committed artifacts, concrete DTOs. |
| Missing base or shallow checkout | Med | Explicit baseline handling and deterministic base retrieval. |
| Unclassified `openapi-diff` changes | Med | Mandatory review policy note. |
| Fastify/Express Swagger pitfalls | Low | Document creation only; no `swagger-ui-express`. |
| Scope creep | Med | Enforce current-surface boundary. |

## Rollback Plan

Revert the single change commit to remove tooling, artifacts, and CI; restore `packages/api-client` to its stub. No data is involved.

## Dependencies

- BACKLOG #2/#3 archived; #6 endpoints documented. Consumers #12/#18+ are later work.
- No external services; export and checks are DB-free. The pending live PostgreSQL gate remains unchanged and orthogonal.

## Success Criteria

- [ ] Export is deterministic, DB-free, and closes cleanly.
- [ ] OpenAPI validates and the generated client compiles.
- [ ] Stale-check fails on generated drift; semantic breaking changes fail while additive v1 changes pass.
- [ ] CI gate is wired after Test and before Build; quality gates are green.
- [ ] Live PostgreSQL acceptance remains explicitly pending and orthogonal.
