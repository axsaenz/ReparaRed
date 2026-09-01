# Proposal: Implement BACKLOG.md item #6: Active catalogs

## Intent
Operationalize the locked catalogs: idempotently seed four service categories and 50 resolved Lima/Callao districts, then expose active-only `/api/v1` reads for forms and later specialty references (PRD, TECH-DESIGN, ADR-0018).

## Scope
### In Scope
- Typed data with provenance; one-transaction upserts by slug/UBIGEO, preserving IDs and never deleting.
- `prisma db seed` configuration, `prisma:seed`, catalog module/service/controller, and `GET /api/v1/categories` plus `/districts`.
- `{data:[...]}` envelope, exact projections, stable ordering, active-only reads (omitted/true accepted, false→422, malformed→400), and persistence failure→503 `application/problem+json` through the existing filter.
- Offline data/seeder/service/inject tests plus lint, format, typecheck, test, build, Prisma validate/generate gates.

### Out of Scope
- New schema/tables/migrations (existing schema remains read-only); admin/writes, auth, OpenAPI, web/deactivation UI, national UBIGEO, geolocation, or consumers #7/#14/#16.
- No live database execution or acceptance claims.

## Capabilities
### New Capabilities
- `active-catalogs`: seed convergence and public active-only category/district reads.
### Modified Capabilities
- None.

## Approach
- `catalog-data.ts`: Gasfitería y tuberías/`gasfiteria-y-tuberias`, Electricidad básica/`electricidad-basica`, Reparación de muebles/`reparacion-de-muebles`, Limpieza especializada/`limpieza-especializada`, 50 districts, provenance comment. `catalog-seeder.ts` performs slug/UBIGEO upserts in one transaction, updates mutable fields including `active`, preserves IDs, and never deletes. `prisma/seed.ts` owns client lifecycle and uses `node --experimental-strip-types prisma/seed.ts`; `apps/api/package.json` adds `prisma:seed` with literal-free `DIRECT_URL`. `tsx` is fallback only; lockfile stays unchanged unless used.
- `src/catalogs/*` plus AppModule: query `active:true`; exact `{id,slug,name}` or `{id,ubigeoCode,name,province,department}` projections, `ubigeo` mapping, slug ASC or UBIGEO ASC/id ASC ordering (full-list MVP exception).
- Static assertions cover four unique slugs, 50 rows, code ranges, Callao names, exact province/department. Fake-client tests prove one transaction, convergence, no deletes; mocked-Prisma service/Fastify `inject()` tests cover filters, envelopes, empty data, 422/400, safe 503, trace headers. No runtime dependencies.

**Recorded pending gate (mandatory):** #4/#5 migration apply→re-apply→status and `prisma db seed` row counts/idempotent re-seed are **UNSATISFIED** without disposable PostgreSQL; evidence is static/fake-client only.

**Data provenance:** UBIGEO is best-effort INEI reconstruction; Callao is verified against the SUNAT annex; the official extract remains pending per BACKLOG. Upsert keys permit corrections without schema change.

## Affected Areas
| Area | Impact | Description |
|---|---|---|
| `apps/api/prisma/seed.ts`, `apps/api/src/database/seeds/*` | New | Entry, data, seeder |
| `apps/api/src/catalogs/*`, AppModule wiring | New | Module, endpoints, projections |
| `apps/api/src/**/*.spec.ts` | New | Data, seeder, service, inject tests |
| `apps/api/package.json` scripts only | Modified | Seed command; no deps |

## Risks
| Risk | Mitigation |
|---|---|
| Provenance | Source note; correction-friendly keys. |
| Native TS on Windows/OneDrive | Verify; documented `tsx` fallback. |
| No live DB proof | Gate stays unsatisfied. |
| Contract stability for #10/#16 | Freeze projections/slugs/envelope/order. |
| Seed reactivation semantics | Explicit active values; no inferred deletes. |
| Test seam / scope drift | Use inject/filter; exclude admin/national/OpenAPI. |

## Rollback Plan
Revert the single commit to remove seeds, endpoints, tests, and scripts; catalog tables remain empty with no local data.

## Dependencies
- #3/#4/#5 archived; #7/#16 are later consumers; no external services.

## Success Criteria
- [ ] Offline gates and static, fake-client, service, inject assertions pass.
- [ ] Seed uses `DIRECT_URL`; no runtime deps; lockfile unchanged unless fallback.
- [ ] Live migrations/seed are **NOT SATISFIED** until disposable PostgreSQL exists.
