# Proposal: Implement BACKLOG.md item #4: Prisma + PostgreSQL

## Intent

Provide monorepo persistence: Prisma/PostgreSQL connectivity, separate runtime/migration URLs, one lazy process-scoped client, and an empty baseline for #5+, per ADR-0006/0007/0008 and TD §12.3.

## Scope

### In Scope
- Prisma setup, config, lazy client, readiness, empty baseline, scripts, offline evidence, ignore rules, and names-only docs.

### Out of Scope
- Domain tables/relations, seed data/scripts, endpoints, Supabase/Railway, Prisma 7/8, and release automation.

## Capabilities

### New Capabilities
- None — persistence belongs to API-foundation behavior.

### Modified Capabilities
- `api-foundation`: R5 (`Dependency-free health probes`) adds bounded database readiness; R7 (`Boot-time dependency discipline`) permits configured dependency without eager connection; liveness stays dependency-free.

## Approach

- In `apps/api`, pin exact `prisma@6.19.3` + `@prisma/client@6.19.3`; add PostgreSQL datasource/generator, empty no-table baseline, and `migration_lock.toml`.
- `AppConfig` syntax-validates supplied `DATABASE_URL` without logging; absent is allowed in test/dev, required only at operational readiness; `.env.example` documents CLI-only `DIRECT_URL`.
- Add `src/database/`: lazy Nest singleton with `OnApplicationShutdown`, no constructor/init connect; bounded readiness query uses the safe-503 filter.
- Add cross-platform npm-syntax-only `prisma:generate`, `prisma:migrate:deploy`, `prisma:migrate:status`, `prebuild` generation, and ignored non-`node_modules` output.
- Verify offline with validate, baseline `migrate diff` SQL, generation/build, lazy/offline/readiness mock tests, and updated API tests.

## Recorded Pending Gate

Live `apply → re-apply → status` on disposable PostgreSQL is **UNVERIFIED**: PostgreSQL/`psql`/Docker absent (checked 2026-09-01). It closes when local disposable PostgreSQL or #11 infrastructure exists; the change is archivable, not fully acceptance-complete.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/api/prisma/*` | New | Schema, empty baseline, lock. |
| `apps/api/src/database/*` | New | Lazy Prisma client seam. |
| `apps/api/src/health/*`, `src/app.module.ts` | Modified | Bounded readiness indicator. |
| `apps/api/src/config/*`, `apps/api/.env.example` | Modified | Safe URL seam and names-only docs. |
| `apps/api/package.json`, `package-lock.json`, `.gitignore` | Modified | Pins, scripts, and output scope. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Windows/OneDrive engines or generated pollution | Med | Ignore output; exclude it from lint; pin versions. |
| Lockfile churn or CLI/client drift | Med | Matching exact versions; clean `npm ci`. |
| Offline checks cannot prove SQL/pooler/repeatability | High | Retain pending gate; never claim live verification. |
| URL secret exposure | Med | Names-only example, safe config, redacted failures. |
| Readiness changes integration expectations | Med | Update tests deliberately; preserve liveness. |

## Rollback Plan

Revert the implementation commit to remove Prisma wiring and restore `api-foundation`; archive reverts its delta. No local data exists.

## Dependencies

- Backlog #1/#2; API-foundation seams, not #3. No external service is reached.

## Success Criteria

- [ ] Exact pins install with clean `npm ci`; `prisma validate` exits 0.
- [ ] Generate and empty-to-schema `migrate diff` produce only the baseline; client stays out of git/lint scope.
- [ ] Offline boot works without `DATABASE_URL`; indicator-unit tests show unreachable DB safely reports readiness down without crash; liveness is unchanged.
- [ ] Updated API tests, lint, typecheck, and build pass; `.env.example` has names only.
- [ ] The live migration gate is explicitly **NOT SATISFIED**.
