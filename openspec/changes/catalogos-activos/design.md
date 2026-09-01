# Design: Active Catalogs

## Technical Approach

Implement `active-catalogs` as a typed Prisma seed plus public NestJS module. Follow ADR-0005/0007/0018: no schema change, active reads, stable projections, one transaction.

## Architecture Decisions

| Decision | Alternatives / tradeoff | Choice and rationale |
|---|---|---|
| Runner/format | `tsx` dependency; ESM/module changes | Node 24 strip-types plus CJS-compatible `require`; no dependency or package-type change. |
| Persistence | Independent or destructive writes | One `$transaction` of unique-key upserts; IDs persist and rows are never deleted. |
| Reads | Bare/paginated responses | Public bounded `{ data }` lists, DB active filter, natural key then ID order. |
| Test seam | `@nestjs/testing` or bootstrap change | Keep `createApp()` unchanged; inject tests stub its resolved Prisma delegates. |
| Errors | Leak or catch everything | Recognized Prisma/connection errors become message-free 503; unexpected errors remain safe 500. |

## Seed Data and Seeder

`apps/api/src/database/seeds/catalog-data.ts` uses typed readonly arrays:

```ts
// Provenance: best-effort INEI reconstruction (official extract pending per BACKLOG; Callao verified vs SUNAT annex).
type CategorySeed = Readonly<{ slug: string; name: string; active: true }>;
type DistrictSeed = Readonly<{
  ubigeo: string; name: string; province: string; department: string; active: true;
}>;
const categories = [
  { slug: 'gasfiteria-y-tuberias', name: 'Gasfitería y tuberías', active: true },
  { slug: 'electricidad-basica', name: 'Electricidad básica', active: true },
  { slug: 'reparacion-de-muebles', name: 'Reparación de muebles', active: true },
  { slug: 'limpieza-especializada', name: 'Limpieza especializada', active: true },
] satisfies readonly CategorySeed[];
const districts = [
  { ubigeo: '150101', name: 'Lima', province: 'Lima', department: 'Lima', active: true },
  /* 150102–150143 and 070101–070106 exactly as supplied */
  { ubigeo: '070107', name: 'Mi Perú', province: 'Callao', department: 'Callao', active: true },
] satisfies readonly DistrictSeed[];
module.exports = { categories, districts };
```

Apply MUST copy all 43 Lima and 7 Callao rows from the authoritative input verbatim and in supplied order; that list is normative, with no omission, reordering, or correction. Add `// Provenance: best-effort INEI reconstruction (official extract pending per BACKLOG; Callao verified vs SUNAT annex).` All rows use `active: true`.

`catalog-seeder.ts` exports `seedCatalogs(prisma: PrismaClient): Promise<{ categories: number; districts: number }>` and uses Prisma 6 inferred `TransactionClient`:

```ts
await prisma.$transaction(async (tx) => {
  for (const row of categories) await tx.category.upsert({
    where: { slug: row.slug }, create: row, update: { name: row.name, active: row.active },
  });
  for (const row of districts) await tx.district.upsert({
    where: { ubigeo: row.ubigeo }, create: row,
    update: { name: row.name, province: row.province, department: row.department, active: row.active },
  });
});
```

Return counts only after commit; never use `createMany({ skipDuplicates })`, deletes, or truncation. `prisma/seed.ts` explicitly reads `process.env.DIRECT_URL`, constructs `new PrismaClient({ datasourceUrl })`, logs counts only, disconnects in `finally`, and sets non-zero `process.exitCode` on a generic failure. Missing `DIRECT_URL` fails before work; schema remains `env("DIRECT_URL")`. CJS `require` imports, erasable types, and no enums/decorators/namespaces keep the package CJS; tests load typed CJS exports.

```json
"prisma": { "seed": "node --experimental-strip-types prisma/seed.ts" },
"scripts": { "prisma:seed": "prisma db seed" }
```

## Interfaces / Contracts

`CatalogsModule` imports `DatabaseModule`; its controller exposes JSON `GET /categories` and `/districts`, automatically under `/api/v1`. `active` absent/`true` accepts; `false` throws `UnprocessableEntityException` (422); other values throw `BadRequestException` (400). Each `findMany` uses `where: { active: true }`, selects `{ id, slug, name }` or `{ id, ubigeo, name, province, department }`, and orders `[{ slug: 'asc' }, { id: 'asc' }]` or `[{ ubigeo: 'asc' }, { id: 'asc' }]`; map `ubigeo` to `ubigeoCode`. Catch known/initialization/connection Prisma errors as message-free 503; unexpected errors stay safe 500. The filter emits `DEPENDENCY_UNAVAILABLE` problem+json.

## Data Flow

    Seed CLI -> DIRECT_URL -> transaction upserts

    HTTP request -> controller -> service (active filter) -> lazy Prisma client -> projection -> { data } envelope

## File Changes

| Path | Action | Description |
|---|---|---|
| `apps/api/src/database/seeds/catalog-data.ts` | Create | Typed data and provenance. |
| `apps/api/src/database/seeds/catalog-seeder.ts`, `apps/api/prisma/seed.ts` | Create | Transaction and CLI lifecycle. |
| `apps/api/src/catalogs/catalogs.module.ts`, `catalogs.service.ts`, `catalogs.controller.ts` | Create | Reads and projections. |
| `apps/api/src/app.module.ts` | Modify | Import `CatalogsModule`. |
| `apps/api/package.json` | Modify | Scripts/config only; no dependencies. |
| `apps/api/src/database/seeds/catalog-data.spec.ts`, `apps/api/src/database/seeds/catalog-seeder.spec.ts` | Create | Offline data and fake-client tests. |
| `apps/api/src/catalogs/catalogs.service.spec.ts`, `apps/api/src/catalogs/catalogs.integration.spec.ts` | Create | Service and Fastify inject tests. |

## Testing Strategy

| Layer | Coverage | Approach |
|---|---|---|
| Unit | Exact four pairs; 50 unique six-digit rows (43 `150101–150143`, 7 `070101–070107`), regions, Callao names; fake seeder convergence; service filters/selects/order/mapping, 422/400/503/500 | Vitest; no database. |
| Integration | `catalogs.integration.spec.ts`: inject envelopes, empty/order evidence, problem type, trace header, sanitized 503 | Existing `createApp()` plus stubbed Prisma delegates. |
| E2E/live | Real migration, seed, counts, and re-seed | Pending disposable PostgreSQL; never claim offline proof as live. |

## Threat Matrix

| Boundary | Applicability | Safe/failure behavior and planned RED test |
|---|---|---|
| npm/Prisma shell command | Applicable: `prisma:seed` invokes CLI | Non-zero failure; no credentials in scripts. RED: manifest/failure-exit test. |
| Secrets | Applicable: `DIRECT_URL` is read | URLs never logged; missing/failure is generic non-zero; counts only. RED: output scrub test. |
| SQL injection | N/A — static data and Prisma parameterization | No raw SQL boundary. |
| Documentation-like paths | N/A — no executable docs classification | None. |
| HTTP routing | Applicable: two routes are added | Exact global-prefix paths; wrong paths stay 404. RED: inject path/status/trace checks. |
| Git repository selection | N/A — no `git -C` or path selection | None. |
| Commit state | N/A — no VCS automation; commit is apply-owned | None. |
| Push state | N/A — no push automation | None. |
| PR commands | N/A — no PR automation | None. |

## Migration / Rollout

Single commit; rollback is revert. No migration is required. Live migration and real `prisma db seed` execution remain **UNSATISFIED** until disposable PostgreSQL exists.

## Open Questions

None expected.
