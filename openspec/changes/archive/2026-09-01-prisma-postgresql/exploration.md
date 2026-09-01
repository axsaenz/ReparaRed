## Exploration: BACKLOG.md item #4 — Prisma + PostgreSQL

### Current State

The workspace is an npm monorepo with `apps/web`, `apps/api`, `packages/api-client`, and `packages/config`. The active toolchain is Node `v24.15.0` with npm `12.0.1`; the root lockfile is `lockfileVersion: 3`, and the quality gates already run lint, formatting, typecheck, tests, and builds. `apps/api/package.json` has no Prisma dependency, no Prisma scripts, and no `prisma/` directory or migration history. The only Prisma-related lockfile entry is an optional peer declaration from `@nestjs/terminus`, not an installed Prisma package.

Per `BACKLOG.md`, item #4 depends only on items #1 and #2, not on item #3. The already-archived API foundation is present in the working tree and exposes useful seams, but it must not turn item #3 into a prerequisite or pull its out-of-scope business behavior into this change.

The intended API placement is locked by `TECH-DESIGN.md`: `apps/api` owns “Prisma y comando de mantenimiento”; `packages/config` is shared tooling configuration and must not become a database package. `apps/web` must not access PostgreSQL directly. The current API is a CommonJS NestJS/Fastify application (`module: commonjs`, `moduleResolution: node10`) with an application-only health check. `apps/api/src/health/health.controller.ts` contains an explicit “Ordered extension point #4: add the database indicator here.”

`apps/api/src/config/env.schema.ts` currently consumes only `NODE_ENV`, `PORT`, `HOST`, and `LOG_LEVEL`. Joi allows unrelated keys, so `DATABASE_URL` can pass through today, but it is not typed, validated, or read by `AppConfigService`. `apps/api/.env.example` contains only the four foundation keys. The current integration tests expect `/health/ready` to return `200` without opening a listener or calling an external dependency.

The canonical `api-foundation` specification still says that readiness is dependency-free and that the foundation “MUST start offline and MUST NOT require database.” This was correct for item #3 before persistence existed. Item #4 can extend the existing implementation seam, but it must explicitly modify or supersede the affected foundation requirements so the contract distinguishes: liveness never calls PostgreSQL; application boot does not connect eagerly; readiness reports the configured database dependency with a bounded timeout. The `monorepo-workspace` specification is not contradicted and should not be changed.

#### Locked decisions and conventions

These are verbatim source excerpts, not new decisions:

> “apps/api/              # NestJS, Prisma y comando de mantenimiento” — `TECH-DESIGN.md`, §3.4

> “Coordinar transacciones, bloqueos de fila y persistencia Prisma/PostgreSQL.” — `TECH-DESIGN.md`, §3.2

> “La conexión de runtime usa el pool compatible con transacciones de la plataforma; migraciones usan la conexión directa indicada por Supabase.” — `TECH-DESIGN.md`, §12.3

> “Migraciones versionadas en el monorepo definirán el esquema y las restricciones de PostgreSQL.” — ADR-0006

> “Se usará Prisma ORM como cliente de PostgreSQL y herramienta principal de migraciones.” — ADR-0007

> “Cuando Prisma no pueda expresar una restricción, índice o migración PostgreSQL necesaria, la migración versionada incluirá SQL explícito. No se usará sincronización automática destructiva del esquema en entornos compartidos o productivos.” — ADR-0007

> “Las migraciones Prisma se ejecutarán una sola vez como paso controlado de release antes de promover la nueva versión de la API, y no de forma concurrente al iniciar cada réplica.” — ADR-0008

> “GET /health/live prueba el proceso; GET /health/ready comprueba dependencias imprescindibles con timeout.” — `TECH-DESIGN.md`, §11

The accepted ADR naming convention is `adrs/NNNN-kebab-case.md`. The logical domain table names are snake_case, while API/TypeScript names are camelCase; no ADR fixes a physical SQL naming mapping beyond the future Prisma migrations. ADR-0002, ADR-0016, ADR-0017, and ADR-0018 govern later domain fields, money, timestamps, and catalog seeds; they do not justify adding those models to this change.

The rest of the persistence design remains a future constraint on later items: PostgreSQL is the source of truth; domain identifiers are opaque; relational foreign keys and critical uniqueness are database defenses; multi-entity writes use short transactions with no network or file work inside them; business records are not physically deleted in the MVP; and PostgreSQL/Storage are not one atomic transaction. These facts affect later modeling and transaction work, not the empty baseline owned here.

#### Empirical local availability

Read-only checks on this Windows machine on 2026-09-01 found:

| Check | Result |
|---|---|
| `psql --version` | Not available: `psql` is not recognized. |
| `Get-Service -Name *postgres* -ErrorAction SilentlyContinue` | No PostgreSQL service returned. |
| `Test-NetConnection 127.0.0.1:5432` | `False`. |
| `docker --version` | Not available: `docker` is not recognized. |

There is therefore no verified local PostgreSQL server, PostgreSQL client, or Docker fallback. Live migration application, rollback, and repeat-application cannot be honestly verified on this machine right now. Offline schema validation can provide partial evidence only; it cannot prove PostgreSQL acceptance, `_prisma_migrations` behavior, pooler compatibility, or idempotent re-application.

#### Registry reality

The requested registry checks returned `prisma` `8.0.0-rc.12` and `@prisma/client` `7.10.0`, so unbounded “latest” installation would not select a matching pair. Exact `7.10.0` packages both report Node support `^20.19 || ^22.12 || >=24.0`; exact `6.19.3` packages both report Node support `>=18.18`. Prisma 7 also changes the current integration model to ESM, a required explicit generated output, a Prisma config file, and a PostgreSQL driver adapter. This is a material compatibility issue for the existing CommonJS API, not a reason to silently convert the whole application during this item.

### Affected Areas

- `apps/api/package.json` — add a matching `@prisma/client` runtime dependency, the Prisma CLI as a development dependency, and cross-platform Prisma generate/migration scripts. Do not add Prisma to the web or shared config package.
- `package-lock.json` — refresh immutably after manifest changes; avoid caret ranges that can resolve Prisma CLI and client to different majors.
- `apps/api/prisma/schema.prisma` — PostgreSQL datasource and generator only for this item; do not declare users, profiles, requests, quotes, services, reviews, catalog tables, or business enums.
- `apps/api/prisma/migrations/` — commit one reproducible initial migration from the empty baseline. It should be empty or contain only a separately justified, tested PostgreSQL extension; it must not front-run items #5–#9.
- `apps/api/src/config/env.schema.ts` and `app-config.service.ts` — consume and safely validate the runtime URL without logging it. Migration-only URL handling should remain in the Prisma CLI configuration/seam rather than becoming a privileged runtime dependency.
- `apps/api/src/database/*` (new seam) and `apps/api/src/app.module.ts` — provide one process-scoped Prisma client, lazy connection behavior, bounded shutdown, and exports for later persistence services. Do not connect in a constructor or module initialization path.
- `apps/api/src/health/*` — add a PostgreSQL readiness indicator only if the chosen contract makes database readiness active; keep liveness dependency-free and preserve safe `503` handling.
- `apps/api/.env.example` — document names only: `DATABASE_URL` for runtime and `DIRECT_URL` for CLI migrations, with no real credentials.
- `.gitignore` or the Prisma output location — keep generated client output and engine artifacts out of the source set. With the CommonJS-compatible path, prefer generated output under ignored `node_modules`; if a custom output is selected, ignore it explicitly and keep it out of lint scope.
- Tests and quality scripts — add offline schema/config tests and, once a PostgreSQL instance exists, a disposable clean-database migration test. Existing foundation tests will need an explicit no-database fixture or updated readiness expectations.

### Approaches

1. **Prisma in `apps/api` with the current CommonJS-compatible major** — place schema, migrations, CLI scripts, and the singleton client under `apps/api`; pin `prisma` and `@prisma/client` to the same exact `6.19.3` release, using runtime `DATABASE_URL` and migration `DIRECT_URL`.
   - Pros: follows the locked monorepo layout; preserves the existing Nest CommonJS build; avoids a broad ESM and driver-adapter migration; exact pair supports Node 24 by registry metadata; keeps domain entities out of this item.
   - Cons: stays on Prisma 6 while the current stable client line is 7; uses Prisma’s binary engine path and its Windows/OneDrive operational risks; an eventual Prisma 7 upgrade will need its own compatibility work.
   - Effort: Medium.

2. **Adopt exact Prisma 7.10.0 now** — use the new generator/configuration model, explicit generated output, ESM-compatible TypeScript settings, and `@prisma/adapter-pg` for runtime pooling.
   - Pros: current matching stable major; aligns with current Prisma direction; driver adapter makes pool settings explicit.
   - Cons: conflicts with the existing CommonJS `apps/api` configuration; expands item #4 into a module-system and dependency migration; generated output can enter lint/build scope; requires more compatibility tests and a deliberate ADR/design decision.
   - Effort: High.

3. **Defer database integration and verify only against future Supabase infrastructure** — add the schema and offline checks now, postponing live migration verification to item #11.
   - Pros: no local database setup; avoids making an unsupported claim about runtime connectivity.
   - Cons: directly misses item #4’s explicit reproducible-migration acceptance; item #11 is production infrastructure and should not be the first place migration behavior is discovered; no evidence for connection pooling or rollback.
   - Effort: Low now, high risk later.

4. **Obtain a local PostgreSQL runtime before implementation verification** — user-installed PostgreSQL is the immediate native option; Docker is the preferable reproducible option if later installed.
   - Pros: enables the required clean-database apply/reapply evidence; a disposable database can test `migrate deploy`, status, and rollback behavior without using production/Supabase.
   - Cons: currently blocked by missing tooling; native installation adds machine-specific setup, while Docker adds a runtime dependency and image lifecycle.
   - Effort: Medium after environment setup.

### Boundary Analysis

**IN:** Prisma and PostgreSQL package setup; datasource provider; separate runtime and migration connection names; safe configuration consumption; one lazy API client seam; one minimal reproducible initial migration; offline checks; live migration verification when a disposable PostgreSQL instance is available; an explicitly bounded database readiness indicator; a future seed hook with no seed data.

**OUT:** all domain tables and relations (`users`, profiles, requests, images, quotes, services, reviews, categories, districts, and specialties); money/`PEN` constraints; UTC domain fields; catalog or identity seed data; API endpoints and business logic; Supabase/Auth/Storage provisioning; Railway/Vercel configuration; production release automation; OpenAPI work. Item #6 may later add an idempotent seed script and catalog data; #4 must not add it now.

### Open Decisions

1. **Prisma major and module system:** choose the exact matching `6.19.3` pair to preserve CommonJS, or explicitly approve the larger Prisma 7.10.0 ESM/adapter migration. Recommendation: `6.19.3` for this bounded item; do not use the reported Prisma 8 release candidate.
2. **Runtime/migration URL contract:** use `DATABASE_URL` for runtime pooling and `DIRECT_URL` for direct CLI migrations. Recommendation: keep the direct URL out of normal API runtime configuration and document both names without values.
3. **Environment requirement timing:** require URL syntax validation when a value is supplied, but do not perform network I/O during bootstrap. Recommendation: make missing/unreachable PostgreSQL visible as readiness failure in operational mode, while keeping liveness and test boot offline; update `api-foundation` R5/R7 as a delta rather than silently violating them.
4. **Client lifecycle:** choose a singleton Prisma provider with lazy `$connect()`/first-query behavior, a bounded readiness query, and orderly shutdown. Recommendation: never connect from a constructor or module import, and never create a client per request.
5. **Initial migration contents:** empty baseline versus a PostgreSQL extension. Recommendation: use the empty baseline unless a future accepted model demonstrably requires an extension; do not add tables “for convenience.”
6. **Live verification environment:** require local PostgreSQL, install Docker, or accept a separately recorded blocker. Recommendation: obtain a disposable local PostgreSQL runtime before declaring item #4 complete; offline checks alone are insufficient.
7. **Seed seam:** no seed data or seed script in #4. Recommendation: leave migration/CLI configuration ready for item #6 to add its idempotent catalog seed.

### Recommendation

Proceed to proposal with `apps/api` as the sole Prisma owner, exact matching Prisma 6.19.3 packages to preserve the current CommonJS API, `DATABASE_URL` for runtime and `DIRECT_URL` for direct migrations, and an empty initial migration. Extend the existing Joi/AppConfig seam without logging credentials, instantiate one lazy client, and modify the API-foundation readiness/boot contract so liveness remains dependency-free while database readiness is explicit and bounded. Use `prisma validate`, client generation, and migration-diff/static checks as offline evidence, but do not label the migration reproducible until it has been applied twice to a clean disposable PostgreSQL database and its status has been checked.

The current machine cannot perform live-migration verification: `psql` and Docker are absent, no PostgreSQL service is present, and port 5432 is closed. This is an implementation/verification blocker for the full acceptance criterion, not a blocker to writing the proposal or defining the offline checks. The preferred resolution is to provision a local disposable PostgreSQL runtime before the apply/verify phase; deferring all live evidence to item #11 should be an explicit exception, not an implicit assumption.

### Risks

- Prisma 7/8 package resolution is incompatible with an unpinned pair and Prisma 7’s ESM/adapter requirements conflict with the current CommonJS API; accidental major drift can break typecheck or boot.
- Prisma binary engines, generated files, file locks, long OneDrive paths, antivirus scanning, and synchronized `node_modules` can make Windows generation and cleanup unreliable.
- A generated client outside ignored `node_modules` can pollute lint, builds, or commits; dependency manifest changes require a lockfile refresh, but `prisma generate` itself must not be treated as a lockfile change.
- Without live PostgreSQL, offline `validate`/diff checks cannot establish SQL execution, migration metadata, rollback, pooler behavior, or repeatability.
- Eager `$connect()` would regress the archived foundation’s offline startup and current no-listener tests; readiness must not be the only place where failure semantics are undocumented.
- Supabase transaction-pooler and direct connections have different capabilities; using the runtime pool URL for migrations can fail even when ordinary queries work.
- URL values, passwords, direct credentials, and database errors must never appear in logs, problem details, `.env.example`, generated artifacts, or test output.
- Future decimal, timestamp, relational, and seed requirements are easy to front-run accidentally; adding them now would violate the backlog’s item boundary and make later migration diffs harder to review.
- The stale planning-only context in `openspec/config.yaml` does not describe the actual scaffold; correcting that metadata is separate and should not be folded into this change.

### Ready for Proposal

Yes, with a clearly recorded live-verification gate. The architecture and code seams are sufficiently understood for proposal work. The proposal must freeze the Prisma major, URL names, lazy/ready lifecycle, modified `api-foundation` semantics, empty-baseline policy, and the exact evidence required once PostgreSQL is available. It must not claim that this machine has verified a live migration.
