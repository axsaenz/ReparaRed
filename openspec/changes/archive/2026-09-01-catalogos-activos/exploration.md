## Exploration: BACKLOG.md item #6 — Active catalogs

### Current State

Item #5 has already created the catalog prerequisites in migration #2. `apps/api/prisma/schema.prisma` contains `Category` and `District` models, and `20260901000000_identity_profiles/migration.sql` creates empty `categories` and `districts` tables with UUID primary keys, unique `slug`/`ubigeo_code`, names, district province/department, and `active BOOLEAN NOT NULL DEFAULT true`. The Prisma field is currently named `District.ubigeo` and maps to the physical `ubigeo_code`; this change must not rename that locked schema field. The migration has no catalog rows and this change must not add another migration.

There is no seed configuration, seed data, catalog service, catalog controller, catalog module, or catalog endpoint. `AppModule` currently imports configuration, logging, `DatabaseModule`, and health only. `PrismaService` is process-scoped and lazy: it receives runtime `DATABASE_URL` but does not connect during construction. The application factory already applies `/api/v1` to business routes, keeps `/`, `/health/live`, and `/health/ready` unversioned, and installs the global `ProblemDetailsFilter`.

The existing API tests use Vitest and Fastify `inject()` without opening a listening socket or contacting dependencies. There is no `@nestjs/testing`, `tsx`, or `ts-node` package installed. The workspace is npm-based (`workspaces` in the root `package.json`), currently runs Node `24.15.0`/npm `12.0.1`, and has Prisma `6.19.3`. Node exposes `--experimental-strip-types`, so a TypeScript seed runner is available without adding a dependency, subject to verification on the real Prisma command and Windows/OneDrive filesystem. The `tsx` string in `package-lock.json` is only an optional Vite peer and is not installed or directly resolvable.

The backlog instruction to provide domain business rules is satisfied by the available `PRD.md`, `TECH-DESIGN.md`, and ADR-0018. The PRD and technical design lock the initial category list to exactly four entries, not an 8–12 category starter set:

1. `Gasfitería y tuberías`.
2. `Electricidad básica`.
3. `Reparación de muebles`.
4. `Limpieza especializada`.

The PRD says categories organize and filter requests. The technical design and ADR-0018 require active catalog reads for forms, no MVP administration panel, and versioned data changes. Deactivating a district must prevent new selections without invalidating historical records. The resolved change context supplies the best-effort 50-row district dataset: 43 Lima-province entries with codes `150101`–`150143`, plus seven Constitutional Province of Callao entries with codes `070101`–`070107`; Lima rows use province/department `Lima`, and Callao rows use province/department `Callao`. The Callao names supplied by the resolved context are Callao, Bellavista, Carmen de la Legua, La Perla, La Punta, Ventanilla, and Mi Perú. Provenance must be recorded in the seed as a best-effort INEI reconstruction, with the Callao list verified against the SUNAT annex; this is not a claim that the pending official national extract has been obtained.

### Affected Areas

- `apps/api/prisma/seed.ts` — Prisma CLI entry point; instantiate one client, invoke the catalog seeder, report only safe counts/errors, and disconnect in `finally`.
- `apps/api/src/database/seeds/catalog-data.ts` — pure, typed category and district seed constants, including the four locked categories, all 50 district rows, stable slugs, active values, and provenance documentation. Keep the exact resolved Lima names here rather than fabricating names in tests or controllers.
- `apps/api/src/database/seeds/catalog-seeder.ts` — reusable idempotent seeding function. It should upsert categories by `slug` and districts by `ubigeo`/physical `ubigeo_code`, update corrected names and location fields, preserve generated IDs, avoid deletes/truncation, and run the complete catalog convergence in one database transaction.
- `apps/api/package.json` — add Prisma's `seed` command configuration and a discoverable `prisma:seed` script. Use the existing `DIRECT_URL` CLI connection contract; no credential or URL literals belong in the script.
- `package-lock.json` — unchanged if Node's built-in TypeScript stripping is used; refreshed only if a fallback runner such as direct `tsx` must be added during implementation.
- `apps/api/src/catalogs/catalogs.module.ts`, `catalogs.controller.ts`, and `catalogs.service.ts` — add the public read module, register it from `AppModule`, query only active rows, select only the API projection, map Prisma's `ubigeo` to API `ubigeoCode`, and preserve stable ordering.
- `apps/api/src/app.factory.ts` or a test-only Nest module — provide a test seam if required to build a Fastify application with a mocked `PrismaService`; production bootstrap must retain the existing prefix, trace, and problem-filter behavior.
- `apps/api/src/catalogs/*.spec.ts` and `apps/api/src/database/seeds/*.spec.ts` — add offline data/seeder unit tests and Fastify-injection endpoint tests with Prisma delegates stubbed. Existing problem handling should be exercised rather than duplicated.
- `apps/api/.env.example` — no change. `DATABASE_URL` remains the runtime pooled connection and `DIRECT_URL` remains the Prisma CLI/migration/seed connection already documented there.
- `apps/api/prisma/schema.prisma` and migration #2 — read-only for this change; no new tables, columns, indexes, or migration rows are needed.

### Approaches

1. **Canonical Prisma seed with Node 24 native TypeScript stripping** — configure `apps/api/package.json` with `"prisma": { "seed": "node --experimental-strip-types prisma/seed.ts" }` and add `"prisma:seed": "prisma db seed"`.
   - Pros: uses Prisma's standard `db seed` lifecycle; has one explicit CLI command; adds no dependency or lockfile churn; matches the repository's Node `^24` engine; keeps `DIRECT_URL` handling in Prisma's existing datasource configuration.
   - Cons: the seed must use erasable TypeScript syntax; the command depends on the pinned Node line; actual Prisma CLI execution remains unverified until a database is available; Node/OneDrive file locking needs a real apply check.
   - Effort: Low/Medium.

2. **Prisma seed command backed by a direct `tsx` runner** — add `tsx` as an API devDependency and use `tsx prisma/seed.ts` in the Prisma seed configuration.
   - Pros: conventional TypeScript execution with fewer native-loader constraints; familiar if the deployment image does not guarantee Node 24.
   - Cons: `tsx` is not currently installed; it requires an explicit manifest and lockfile change plus dependency installation; it is unnecessary while the workspace guarantees Node 24; installation scripts and Windows path behavior add another verification surface.
   - Effort: Medium.

3. **Plain JavaScript Prisma seed** — use `node prisma/seed.js`, optionally importing pure data from a compiled or JSON module.
   - Pros: no TypeScript runner and no new dependency; widest Node compatibility.
   - Cons: loses direct type checking for the 50-row dataset and the seeder boundary; sharing typed constants with Vitest is less clean; provenance and data-shape errors move later in the feedback cycle.
   - Effort: Low initially, Medium for maintainability.

4. **Bounded catalog read module with full-list responses** — expose `GET /api/v1/categories` and `GET /api/v1/districts` from a dedicated Nest module. Return `{ "data": [...] }`, filter in Prisma with `active: true`, and order categories by `slug ASC` and districts by `ubigeo ASC` (with `id ASC` as a deterministic tie-breaker). Do not paginate these bounded reference lists in the MVP: four categories and 50 districts fit in one response. The general page/limit convention remains for business lists, not these catalogs.
   - Pros: matches the technical-design surface and form use case; avoids exposing inactive options; avoids in-memory filtering; keeps a stable response envelope and ordering; does not invent schema fields.
   - Cons: the response envelope and catalog pagination exception are not explicitly frozen in the existing documents; a future national catalog may outgrow a full-list response and require an additive contract or versioned change.
   - Effort: Medium.

### Endpoint and Seed Contract Recommendation

The proposal should freeze the following item-level contract:

- `GET /api/v1/categories` and `GET /api/v1/districts` are unauthenticated reads intended for forms. No role, ownership, or admin behavior is added.
- Both endpoints return `application/json` with `{ "data": [...] }`. An empty catalog is a successful `200` with an empty `data` array, not an error.
- The category projection is exactly `{ id, slug, name }`; the district projection is exactly `{ id, ubigeoCode, name, province, department }`. Do not expose `active`, relations, timestamps, or internal Prisma names.
- `active` is an optional query parameter whose effective default is `true`. The service must apply `where: { active: true }` in the database query. Recommend accepting omitted/`active=true` and rejecting `active=false` with semantic `422` rather than exposing inactive rows from a public MVP endpoint. A malformed value is input `400`. If a later admin/read use case needs inactive rows, it should receive a separately authorized contract instead of weakening these endpoints.
- Catalog reads are not paginated in this item. Use stable ordering by `slug` for categories and `ubigeo` for districts; the API field `ubigeoCode` is mapped from the current Prisma `ubigeo` field.
- Persistence/read failures must be translated at the catalog persistence boundary to `ServiceUnavailableException` (or an equivalent existing dependency error), allowing the global filter to produce the established `application/problem+json` `503` with `DEPENDENCY_UNAVAILABLE`. Raw Prisma messages, SQL, connection details, and URLs must not reach clients. Unexpected programming errors may continue to map to the existing safe `500`.
- Each seed row includes `active: true` initially. An upsert updates the mutable source fields and active value while omitting `id` from the update, so reruns preserve UUIDs and converge corrected data. Rows absent from a later seed version are not physically deleted implicitly; explicit deactivation should be represented by versioned seed data. The seed must never use `deleteMany` or `truncate`.
- Recommended stable category slugs derived from the locked names are `gasfiteria-y-tuberias`, `electricidad-basica`, `reparacion-de-muebles`, and `limpieza-especializada`. These slugs are identifiers for later request/specialty references, not display text, and must not be silently renamed.

### Boundary Analysis

**In scope:**

- The four locked category rows and the resolved 50-row Lima/Callao district dataset, including provenance and active values.
- Idempotent category/district upserts keyed by `slug` and `ubigeo_code`, preferably in one transaction, with no destructive cleanup.
- Prisma seed configuration and npm workspace invocation using existing `DIRECT_URL` conventions.
- A Nest catalog module, public active-only read endpoints, bounded projections, stable ordering, the `data` JSON envelope, and dependency-safe errors.
- Unit tests for seed data shape and upsert behavior; Fastify `inject()` tests with Prisma stubbed/mocked for active filtering, projections, ordering, envelopes, empty results, and safe dependency failures.
- Offline Prisma validation/generation and existing lint, format, typecheck, build, and test gates.

**Out of scope:**

- New tables, columns, migrations, admin catalog CRUD, write endpoints, activation/deactivation UI, audit history, or destructive row cleanup.
- Expanding beyond Lima and Callao, a national official UBIGEO import, maps, coordinates, geolocation, or an unverified claim of official completeness.
- Requests, specialties, profile rules, publication validation, or any other consumer business behavior from items #7, #14, #16, and later.
- OpenAPI generation/client output (#10), web UI consumption (#14/#18 and later), BFF changes, authentication, and authorization policy beyond public catalog reads.
- Live PostgreSQL seed execution. Migration apply/re-apply/status and seed execution remain a pending live gate until disposable PostgreSQL is available.

### Offline Verification Strategy

The implementation can provide concrete offline evidence without claiming database execution:

1. Static/unit data tests assert exactly four unique non-empty category slugs/names, exactly 50 districts, unique six-digit codes, the two expected code ranges, the seven Callao names, and exact province/department values for each regional group. The resolved 43 Lima names must be asserted from the committed seed table, not invented by tests.
2. Seeder unit tests use a fake Prisma client/delegates to assert one transaction, `upsert` calls keyed by `slug` and `ubigeo`, complete create/update payloads, active values, no delete/truncate calls, and convergence when the fake store is seeded twice. This proves the module's idempotency logic, not PostgreSQL's unique-index behavior.
3. Catalog service/controller unit tests assert active-only `findMany` filters, explicit `select` projections, stable ordering, `ubigeo` to `ubigeoCode` mapping, supported `active` parsing, and safe dependency-error translation.
4. Fastify `inject()` tests should construct the catalog HTTP surface with `PrismaService` stubbed/mocked and assert `200` envelopes, inactive-row exclusion at the query contract, empty results, malformed/false active handling, trace headers, and `503 application/problem+json` without dependency details. Prefer a small reusable test application seam or `@nestjs/testing` only if the existing factory cannot be overridden; the package is not currently installed.
5. `prisma validate`, `prisma generate`, `npm test`, `npm run lint`, `npm run format:check`, `npm run typecheck`, and `npm run build` are offline-verifiable. `npm run prisma:seed --workspace=@repara/api`, `prisma migrate deploy`, re-apply, status, and any executed uniqueness/transaction proof require a real disposable PostgreSQL instance and must remain explicitly pending.

### Open Decisions

| Decision | Options | Recommendation |
|---|---|---|
| Seed runner | Prisma `seed` configuration with Node native TypeScript; direct `tsx`; plain JavaScript | Use Prisma `db seed` configured as `node --experimental-strip-types prisma/seed.ts`, because Node 24 is the declared engine and no runner is installed. Fall back to a direct `tsx` devDependency only if implementation verification proves native stripping incompatible. |
| Seed data location | Inline in `prisma/seed.ts`; pure data/seeder under `src/database/seeds`; JSON/JavaScript fixture | Keep pure data and the reusable seeder under `src/database/seeds`, with a thin `prisma/seed.ts` entry point. This makes data shape and idempotency logic testable without constructing Prisma. |
| Transaction boundary | Independent upserts; one transaction for all rows; destructive replace | Use one transaction for all category and district upserts. Never replace or delete rows implicitly. |
| Category content/slugs | Add 8–12 recommendations; use the locked four; arbitrary slugs | Use only the four locked names and the normalized stable slugs listed above. Do not reopen the category list. |
| Response envelope | Bare arrays; `{ data: [...] }`; `{ data, meta }` | Use `{ data: [...] }` for both endpoints. Do not add pagination metadata until pagination is actually introduced. |
| Pagination | General page/limit convention; full bounded list; cursor | Use a full list for these bounded MVP catalogs, with stable database ordering. Document this as an item-specific exception to the general business-list pagination rule. |
| Inactive query behavior | Always ignore query; support `true`/`false`; active-only with `false` rejected | Keep public reads active-only; accept omitted/`true`, reject `false` as semantic invalid. A later authorized inactive view must be separate. |
| HTTP test seam | Add `@nestjs/testing`; test controllers only; reusable test module/factory override | Preserve HTTP evidence with Fastify `inject()` and a mocked Prisma provider. Prefer a reusable test module/factory seam; do not reduce coverage to controller-only tests. |

### Recommendation

Proceed with the canonical Prisma seed plus a dedicated catalog read module. Put the resolved four-category and 50-district data in a pure seed-data module, use one transaction of unique-key upserts, preserve IDs and historical rows, and document the best-effort UBIGEO provenance in the seed. Configure `prisma db seed` through the API package using Node 24 native type stripping, with `tsx` explicitly treated as a fallback rather than an assumed transitive dependency.

Expose public, active-only, full-list reads under `/api/v1` using the `{ data: [...] }` envelope and projections that hide persistence-only fields. Keep the existing lazy Prisma seam and global problem filter; add only the catalog-specific service/module wiring and a minimal test override seam. Do not alter the schema or migration created by item #5, and do not add a broad category set despite the generic starter-set possibility because both PRD and TECH-DESIGN already lock four names.

### Risks

- **UBIGEO provenance and completeness:** the supplied data is a best-effort reconstruction, not the pending official national extract. The seed must preserve provenance, use six-digit unique keys, and allow later authoritative corrections through upsert without a schema change. The exact 43 Lima names must come from the resolved seed table, not guesses.
- **Seed runner/tooling:** `tsx` and `ts-node` are absent. Native Node stripping is compatible with the declared Node line but must be verified with Prisma CLI and the Windows/OneDrive path; otherwise a direct devDependency and lockfile change is unavoidable.
- **No live PostgreSQL:** offline tests cannot prove PostgreSQL unique constraints, transaction atomicity, `prisma db seed`, migration application, re-application, status, or actual row counts after execution. These remain recorded pending gates.
- **Contract stability:** the `data` envelope, no-pagination exception, normalized slugs, `active=false` behavior, and `ubigeoCode` API mapping should be frozen before #10 OpenAPI and later specialty/request consumers.
- **Inactive-row semantics:** resetting `active` on every seed rerun could unintentionally reactivate a future deactivation. Seed records must own the intended active value and future deactivations must be explicit versioned data, not an omitted-row side effect.
- **Test wiring:** the current application factory has no provider override and `@nestjs/testing` is absent. The implementation must retain true Fastify HTTP coverage with a stubbed Prisma client without opening a socket or contacting PostgreSQL.
- **Scope drift:** adding admin mutations, pagination infrastructure, national coverage, category expansion, or OpenAPI artifacts would exceed item #6 and create coupling with later backlog items.
- **OneDrive/Windows behavior:** Prisma engines, native TypeScript loading, generated client files, and concurrent synchronization can produce file-lock or path issues; generated output must remain ignored and no secrets may be written to artifacts.

### Ready for Proposal

Yes. The repository state, locked category rules, resolved UBIGEO boundary, seed/idempotency contract, endpoint projections, error behavior, test strategy, and live-gate limits are sufficiently clear for proposal work. The proposal should freeze the recommended slugs, envelope, active-query policy, full-list behavior, transaction/upsert semantics, and Node-native seed command, while carrying the exact resolved 50-row dataset and its provenance into design/tasks.
