# Apply Progress: Active Catalogs

## Status

- Change: `catalogos-activos`
- Artifact store: `openspec`
- Mode: Standard (strict TDD disabled)
- Delivery resolution: `size:exception` APPROVED by the orchestrator; one cohesive unit and one commit, with no remote available for a chain.
- Task completion: 17/17 complete in `tasks.md`.

## Completed Implementation

### Seed foundation

- Added the four locked category rows and the resolved 43 Lima plus seven Callao district rows.
- Recorded best-effort INEI reconstruction provenance, the pending official extract, Callao verification against the SUNAT annex, and correction-friendly natural-key upserts.
- Added one-transaction category and district upserts keyed by `slug` and `ubigeo`, including mutable fields and `active` updates without ID changes or destructive cleanup.
- Added a standalone Node 24 native-strip seed entry point that reads `DIRECT_URL`, reports count-only success output, reports generic failures, and disconnects in `finally`.
- Added only the requested Prisma configuration and npm script; no dependency or lockfile change was made.

### Catalog API

- Added the active-only category and district service, exact projections, stable natural-key/ID ordering, and `ubigeo` to `ubigeoCode` mapping.
- Added the unauthenticated `GET /api/v1/categories` and `GET /api/v1/districts` handlers under the existing global prefix.
- Added `CatalogsModule` with `DatabaseModule` and wired it into `AppModule` without changing production bootstrap behavior.
- Translated recognized Prisma/dependency failures to safe 503 exceptions and unexpected failures to safe 500 exceptions; the existing problem filter supplies `application/problem+json` responses.

### Tests

- Added static data-shape assertions for locked categories, all 50 districts, ranges, uniqueness, regions, Callao names, and provenance.
- Added fake-client seeder assertions for one transaction per run, natural-key upserts, active-field convergence, ID preservation, no destructive operations, rollback propagation, and double-run convergence.
- Added service assertions for query filters, exact selections, ordering, mapping, query validation, dependency-safe 503, and safe 500 behavior.
- Added Fastify `inject()` assertions for envelopes, empty results, trace propagation, ordering contracts, invalid active values, sanitized failure responses, and wrong-path 404.

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `npm test` — PASS; web 1 file/1 test and API 15 files/93 tests, 93 tests passed. |
| Runtime harness command/scenario and exact result | `npx vitest run src/catalogs/catalogs.integration.spec.ts` from `apps/api` — PASS; 1 file/9 tests, including real Nest/Fastify `inject()` requests against stubbed resolved Prisma delegates. |
| Seed runtime harness | `node --experimental-strip-types apps/api/prisma/seed.ts` with `DIRECT_URL` absent — expected offline failure, exit code 1, output only `Catalog seed failed.`; parsing/loading succeeded and no database connection was attempted. |
| Rollback boundary | Revert the single exact commit `chore: add active catalogs`; it removes the seed, API, tests, package scripts, and apply records without touching schema or migrations. |

All offline/static evidence above is labeled `STATIC` or offline and does not claim PostgreSQL execution.

## RED-Gate Evidence

| Gate | Evidence |
|---|---|
| Seed failure exit | Missing-`DIRECT_URL` native-strip smoke returned non-zero exit code 1 with a generic failure line. |
| Secrets scan | No `postgres://`, `postgresql://`, `password`, or `secret` literals were found in the created/modified seed, catalog, module, test, manifest, or package files. Existing unrelated tests were not modified. |
| Log safety | The success log template contains only category and district counts; the failure log is generic and emits no configuration, URL, SQL, or credential details. |
| Native strip-types | PASS for syntax/loader behavior; the expected offline configuration failure occurred before any database work. |
| Format | `npm run format:check` — PASS. |
| Lint | `npm run lint` — PASS; the existing Next pages-directory notice remains non-fatal. |
| Typecheck | `npm run typecheck` — PASS. |
| Test | `npm test` — PASS; 93 tests passed across the workspace. |
| Build | `npm run build` — PASS for web and API. |
| Prisma validation | `npx prisma validate --schema apps/api/prisma/schema.prisma` with an ephemeral command-line placeholder for `DIRECT_URL` — PASS. No schema or migration file changed. |
| Prisma generation | `npm run prisma:generate --workspace=@repara/api` — PASS. Generated output was not staged. |
| Commit-state RED | Explicit staging is limited to the implementation files, tests, `apps/api/package.json`, and `openspec/changes/catalogos-activos` artifacts. Generated output, `node_modules`, `.prisma`, `dist`, lockfiles, schema, and migrations are excluded. The exact staged diff is inspected before the single commit; no `commit -a` or push is used. |

## Authored Count and Delivery Boundary

The implementation is intentionally not compressed or minified to chase the 400-line review budget. The exact staged diff contains **1,404 implementation and test additions**, **85 apply-progress additions**, and **588 carried active-change planning additions**, for **2,077 staged additions** before commit. This exceeds the forecast budget because the complete 50-row dataset and mandated contract tests are part of one cohesive unit; the approved resolution is `size:exception`.

## Pending Live Gates

The following gates remain **UNSATISFIED** because disposable PostgreSQL is unavailable:

- Migrations #1–#2 apply, re-apply, and status verification.
- Real `prisma db seed` execution with observed row counts.
- Real idempotent re-seed with observed unchanged IDs and converged row counts.

Offline fake-client and `inject()` evidence must not be reported as live database proof.

## UBIGEO Provenance

The committed 50-row district table is a best-effort INEI reconstruction. The official extract remains pending per BACKLOG; the seven Callao names were verified against the SUNAT annex. Upserts use `ubigeo` as the stable natural key so a later authoritative correction can update source fields without a schema change or implicit deletion.

## Issues and Deviations

- Deviation: none from the approved design; the CJS seed modules use erasable type-only markers plus `module.exports` so Node native strip-types can load them without converting the CJS application to ESM.
- Issue: live PostgreSQL gates cannot run in this environment and remain explicitly unsatisfied.
- Issue: Prisma 6.19.3 reports its existing package-json seed configuration will be deprecated in Prisma 7; the requested Prisma 6 configuration is retained unchanged in shape.
