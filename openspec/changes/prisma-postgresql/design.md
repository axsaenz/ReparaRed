# Design: Prisma + PostgreSQL

## Technical Approach

Implement item #4 in `apps/api`, preserving CommonJS and making all 12 `api-foundation` scenarios achievable offline. Add exact Prisma 6.19.3 pins, an empty baseline, separate URL paths, one lazy client, and bounded readiness. No models, seeds, extensions, endpoints, or release automation.

## Architecture Decisions

| Decision | Choice | Alternative/tradeoff | Rationale |
|---|---|---|---|
| Schema/baseline | PostgreSQL datasource, default `prisma-client-js` output, zero models; comment-only baseline; lock `provider = "postgresql"`. | `migrate dev` needs a live DB; populated schema front-runs later items. | Default node_modules output is CJS-compatible and outside git/lint. Empty-to-schema diff emits no SQL: schema ≡ baseline. |
| URL wiring | Schema `DIRECT_URL`; runtime `PrismaClient({ datasourceUrl: AppConfig.databaseUrl })`. | Env swapping needs POSIX/cmd/PowerShell syntax, not portable in npm scripts. | CLI migrations use direct access; runtime uses pooled `DATABASE_URL`. `DIRECT_URL` is CLI-only; `validate` gets temporary verification env. |
| Config/lifecycle | Optional Joi URI with `postgres`/`postgresql` scheme; one client; no constructor/init connect; guarded `onApplicationShutdown` disconnect. | Required boot or per-request clients break offline boot/singleton policy. | Missing URL is tolerated; configured failure is readiness-only. URL values never enter logs/problems/errors; messages name `DATABASE_URL` only. |
| Health/dependencies | Conditional DB indicator; 2000ms `SELECT 1`; liveness empty. | Terminus v12 has no `HealthCheckError`; Prisma 7 ESM/adapters and Prisma 8 RC are rejected. | Existing catch/status handling maps down/error to `ServiceUnavailableException` and the global filter returns safe 503. |
| Manifest/scripts | Exact `@prisma/client` dependency and `prisma` devDependency, both `6.19.3`; refresh lockfile. `prisma:generate=prisma generate`, `prisma:migrate:deploy=prisma migrate deploy`, `prisma:migrate:status=prisma migrate status`, `prebuild=prisma generate`. | Unpinned or mismatched packages permit CLI/client drift. | Matching pins preserve CJS; npm-only scripts contain no credentials. |

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DIRECT_URL")
}
generator client {
  provider = "prisma-client-js"
}
```

## Data Flow and Interfaces

`DIRECT_URL` → Prisma CLI; `DATABASE_URL` → `AppConfig` → one `PrismaService` → lazy client → queries. Configured construction sets `datasourceUrl` but does not connect; shutdown guards `$disconnect()`. `ready` adds the indicator only when configured; `live` calls `check([])`. `isReachable(timeoutMs)` races `$queryRaw\`SELECT 1\`` against a timer and resolves `false` on error/expiry, so the indicator reports down. No URL means no indicator or boot network I/O.

## File Changes

| Path | Action | Description |
|---|---|---|
| `apps/api/prisma/schema.prisma`; `apps/api/prisma/migrations/00000000000000_baseline/migration.sql`; `apps/api/prisma/migrations/migration_lock.toml` | Create | Empty schema and baseline. |
| `apps/api/src/database/prisma.service.ts`; `apps/api/src/database/database.module.ts`; `apps/api/src/database/prisma-health.indicator.ts` | Create | Client, module, probe. |
| `apps/api/src/config/env.schema.ts`; `apps/api/src/config/app-config.service.ts` | Modify | Safe optional runtime URL. |
| `apps/api/src/health/health.controller.ts`; `apps/api/src/health/health.module.ts`; `apps/api/src/app.module.ts` | Modify | Conditional readiness. |
| `apps/api/src/config/env.schema.spec.ts`; `apps/api/src/health/health.controller.spec.ts`; `apps/api/src/app.integration.spec.ts`; `apps/api/src/database/prisma.service.spec.ts`; `apps/api/src/database/prisma-health.indicator.spec.ts` | Modify/Create | Unit and `inject()` coverage. |
| `apps/api/package.json`; `package-lock.json`; `apps/api/.env.example` | Modify | Pins, scripts, names-only docs. |
| `.gitignore` | Verify/modify if needed | Default generated output is already ignored. |
| `apps/api/src/main.ts` | Verify; no change | Bootstrap stays dependency-free. |

## Testing Strategy

| Layer | Offline proof |
|---|---|
| CLI/static | Runner injects temporary dummy `DIRECT_URL`: `npm exec --workspace=@repara/api -- prisma validate`; `npm exec --workspace=@repara/api -- prisma migrate diff --from-empty --to-schema-datamodel apps/api/prisma/schema.prisma` (no SQL); `npm run prisma:generate --workspace=@repara/api`. |
| Unit/integration | `npm test`: URL valid/invalid/absent and redaction; no-connect constructor spy; stubbed down indicator; script no-literal assertions; `inject()` no-URL ready 200 and unreachable configured ready 503 without network. |
| Quality/live | `npm run lint`; `npm run format:check`; `npm run typecheck`; `npm run build`. Pending disposable-PG deploy → re-deploy → status is recorded in `proposal.md` §Recorded Pending Gate and `pre-proposal.md` §Known blocker; never claim offline. |

## Threat Matrix

| Boundary | Applicability; safe/failure behavior | Planned RED |
|---|---|---|
| Shell commands | Applicable: npm invokes Prisma; env supplies URLs; scripts carry none; CLI failures stay nonzero. | Assert commands and no URL literals. |
| Secrets | Applicable: values never reach logs, problems, commits, or examples; key-only errors. | Assert invalid output names key, not value. |
| Commit state | Applicable/apply-owned: one intended commit; wrong/empty staging fails; no `commit -a`. | Verify scoped staged manifest and rejection conditions. |
| Documentation-like paths | N/A: no executable docs. | None. |
| Git repository selection | N/A: no selector automation. | None. |
| Push state | N/A: no push automation. | None. |
| PR commands | N/A: no PR automation. | None. |
| Log injection | N/A: no new inbound text. | None. |

## Migration / Rollout

Single commit; run migrations once before promotion, never at replica startup. Rollback is revert; no local data exists. Live apply → re-apply → status remains pending.

## Open Questions

None.
