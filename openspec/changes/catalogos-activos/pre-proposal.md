# Pre-Proposal State — gentle-ai.sdd-preproposal/v1

- revision: 1
- status: confirmed
- exploration: `openspec/changes/catalogos-activos/exploration.md`
- research: unselected
- proposal_ready: true
- confirmed_by: orchestrator (auto mode mandate 2026-09-01 — recommended options auto-selected)

## Confirmed product decisions

| # | Decision | Confirmed value |
|---|----------|-----------------|
| 1 | seed_runner | `prisma-db-seed-node-native` — `prisma db seed` configured as `node --experimental-strip-types prisma/seed.ts` (Node 24 engine); `tsx` devDep is the documented fallback ONLY if native stripping proves incompatible during implementation |
| 2 | seed_data_location | `src-database-seeds` — pure typed data (`catalog-data.ts`) + reusable seeder (`catalog-seeder.ts`) under `apps/api/src/database/seeds/`; thin `prisma/seed.ts` entry point |
| 3 | transaction_boundary | `one-transaction-upserts-no-deletes` — all category + district upserts in one transaction; never deleteMany/truncate; upserts preserve generated IDs and converge corrected data |
| 4 | category_content | `locked-four` — exactly: Gasfitería y tuberías (`gasfiteria-y-tuberias`), Electricidad básica (`electricidad-basica`), Reparación de muebles (`reparacion-de-muebles`), Limpieza especializada (`limpieza-especializada`); slugs are stable identifiers, never silently renamed |
| 5 | response_envelope | `data-array` — both endpoints return `{ "data": [...] }`, application/json; empty catalog = 200 with empty data |
| 6 | pagination | `full-list-exception` — bounded MVP catalogs return full lists, stable DB ordering (categories slug ASC, districts ubigeo ASC, id ASC tie-break); documented exception to business-list pagination |
| 7 | inactive_query | `active-only-reject-false` — DB filters active:true; omitted/`active=true` accepted; `active=false` → semantic 422; malformed → 400; future inactive views need separate authorized contract |
| 8 | http_test_seam | `fastify-inject-mocked-prisma` — real HTTP coverage via inject() with stubbed Prisma provider; no @nestjs/testing dependency unless factory override proves impossible |

## Locked content (binding, from PRD/TECH-DESIGN/ADR-0018 + orchestrator-resolved UBIGEO)

- Districts dataset: 50 rows — Lima province 43 districts (150101–150143, province/department "Lima") + Callao 7 (070101 Callao, 070102 Bellavista, 070103 Carmen de la Legua, 070104 La Perla, 070105 La Punta, 070106 Ventanilla, 070107 Mi Perú; province/department "Callao"). Provenance: best-effort INEI reconstruction pending official extract; upsert-keyed so corrections need no schema change.
- District projection: `{ id, ubigeoCode, name, province, department }` (ubigeoCode ← Prisma field `ubigeo` ← physical `ubigeo_code`); category projection: `{ id, slug, name }`. Never expose active/timestamps/relations.
- Persistence failures at catalog boundary → 503 problem+json DEPENDENCY_UNAVAILABLE; no SQL/URL/Prisma internals to clients.
- Schema/migration from item #5 are READ-ONLY for this change (no new migration).

## Capability impact (binding)

NEW capability `active-catalogs` (seed contract + read endpoints + projections + idempotency). No modifications to existing capabilities.

## Scope boundary (binding)

IN: seed data (4 categories + 50 districts with provenance), idempotent transactional seeder, Prisma seed config + npm script, catalogs module/service/controller (GET /api/v1/categories, GET /api/v1/districts), offline unit/inject tests, quality gates. OUT: new tables/migrations, admin/write endpoints, deactivation UI, national UBIGEO, geolocation, consumers (#7/#14/#16), OpenAPI (#10), auth, web UI, live-DB execution (pending gate).

## Carried forward (binding)

Live PostgreSQL gate (migrations apply→re-apply→status + NOW seed execution) remains UNSATISFIED — offline evidence only (fake-client seeder tests, static data assertions); MUST NOT claim live acceptance.
