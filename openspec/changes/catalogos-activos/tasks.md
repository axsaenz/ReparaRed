# Tasks: Active Catalogs

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 550–650 authored |
| 400-line budget risk | High |
| Chained PRs recommended | Yes; retain one cohesive unit under size:exception |
| Suggested split | One cohesive PR; no remote chain |
| Delivery strategy | ask-on-risk |
| Chain strategy | size-exception |

### Suggested Work Unit

| Unit | Goal | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| 1 | Seed, API, tests, and records | `npm test` | N/A: disposable PostgreSQL is unavailable; use fake Prisma and `inject()` | Revert the single exact commit |

## Phase 1: Seed Foundation

- [x] 1.1 Create `apps/api/src/database/seeds/catalog-data.ts` with typed readonly arrays: the four exact locked category pairs, all 43 Lima plus seven Callao rows with exact codes/names/province/department from the design, UTF-8 accents, supplied order, and required provenance comment.
- [x] 1.2 Create `apps/api/src/database/seeds/catalog-seeder.ts` with one transactional sequence of slug/UBIGEO upserts, mutable-field/`active` updates, ID preservation, post-commit counts, and no deletes or truncation.
- [x] 1.3 Create `apps/api/prisma/seed.ts` using erasable TypeScript, `DIRECT_URL`, safe count-only logs, generic failure exit status, and `finally` disconnect; update `apps/api/package.json` scripts/config only with `prisma.seed` and `prisma:seed`, adding no dependency.

## Phase 2: Catalogs API

- [x] 2.1 Create `apps/api/src/catalogs/catalogs.service.ts` with active-only Prisma filters, exact selects, natural-key/id ordering, `ubigeo`→`ubigeoCode` mapping, 422/400 active parsing, sanitized 503 dependency translation, and safe unexpected 500 behavior.
- [x] 2.2 Create `apps/api/src/catalogs/catalogs.controller.ts` with unauthenticated category/district GET handlers under the existing global `/api/v1` prefix.
- [x] 2.3 Create `apps/api/src/catalogs/catalogs.module.ts`, import `DatabaseModule`, and wire it in `apps/api/src/app.module.ts` without changing production bootstrap behavior.
- [x] 2.4 Keep `apps/api/src/catalogs/catalogs.integration.spec.ts` as the minimal test seam: stub resolved Prisma delegates or a module factory only in tests, leaving `createApp()` production wiring identical.

## Phase 3: Tests

- [x] 3.1 Create `apps/api/src/database/seeds/catalog-data.spec.ts` asserting exact four slugs/names, 50 unique rows, code ranges, regions, Callao names, and provenance.
- [x] 3.2 Create `apps/api/src/database/seeds/catalog-seeder.spec.ts` with a fake client proving one transaction, key upserts, active updates, no deletes, and double-run convergence.
- [x] 3.3 Create `apps/api/src/catalogs/catalogs.service.spec.ts` covering filters, exact projections, ordering, mapping, 422/400, sanitized 503, and safe 500.
- [x] 3.4 Create `apps/api/src/catalogs/catalogs.integration.spec.ts` using `inject()` for envelopes, empty data, ordering, invalid active values, sanitized stubbed 503, trace header, and wrong-path 404; finish with workspace `npm test` green.

## Phase 4: Verification Gates

- [x] 4.1 Run RED shell/secrets gates before staging: prove seed failure is non-zero, scan seed/manifest/module files for URL or credential literals, and verify logs contain counts only.
- [x] 4.2 Run the offline native-strip smoke check: `node --experimental-strip-types apps/api/prisma/seed.ts` with missing `DIRECT_URL`; document clean configuration failure proving parse/load without database connection.
- [x] 4.3 Pass lint, format:check, typecheck, test, build, Prisma validate, and Prisma generate.
- [x] 4.4 Run commit-state RED before commit: verify index completeness, no generated artifacts/schema changes, exact staged diff, and clean post-commit tree; never use `commit -a` or push.
- [x] 4.5 Create exactly one commit: `chore: add active catalogs`.

## Phase 5: Records

- [x] 5.1 Create `openspec/changes/catalogos-activos/apply-progress.md` with delivery/work-unit evidence labeled STATIC/offline, the pending migrations #1–#2 apply→re-apply→status and real seed row-count/idempotent-reseed gate as UNSATISFIED without disposable PostgreSQL, and the best-effort UBIGEO provenance/correction-friendly upsert note.
