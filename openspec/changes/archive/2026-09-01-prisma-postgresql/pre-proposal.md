# Pre-Proposal State — gentle-ai.sdd-preproposal/v1

- revision: 1
- status: confirmed
- exploration: `openspec/changes/prisma-postgresql/exploration.md`
- research: unselected
- proposal_ready: true
- confirmed_by: orchestrator (auto mode mandate 2026-09-01 — recommended options auto-selected)

## Confirmed product decisions

| # | Decision | Confirmed value |
|---|----------|-----------------|
| 1 | prisma_major | `exact-6.19.3-pair` — prisma + @prisma/client pinned to EXACT matching 6.19.3 (CJS-compatible; Prisma 7 ESM/adapter model conflicts with current API; Prisma 8 RC forbidden) |
| 2 | url_contract | `runtime-DATABASE_URL + migration-DIRECT_URL` — runtime pool URL consumed by API; direct URL used by Prisma CLI migrations only; both documented by NAME in .env.example, never values |
| 3 | env_timing | `validate-syntax-no-network-at-boot` — URL syntax validated when supplied; zero network I/O at bootstrap; missing/unreachable DB surfaces as readiness failure in operational mode, never as boot crash |
| 4 | client_lifecycle | `lazy-singleton` — one process-scoped Prisma client; lazy connect (first query); bounded readiness query; orderly shutdown; never connect in constructor/module init; never per-request clients |
| 5 | initial_migration | `empty-baseline` — exactly one reproducible baseline migration with no domain tables/enums/extensions (no front-running #5–#9) |
| 6 | live_verification | `deferred-recorded-gate` — machine has no PostgreSQL/psql/Docker (empirically verified 2026-09-01): offline evidence now (prisma validate, client generate, migrate diff SQL, wiring tests); LIVE apply/reapply/status evidence RECORDED AS PENDING GATE to close when a disposable PostgreSQL exists; change MUST NOT claim live-verified |
| 7 | seed_seam | `no-seed-now` — CLI/migration config leaves the seam for item #6 idempotent catalog seed; no seed script or data in #4 |
| 8 | capability_delta | `modify-api-foundation` — R5 readiness gains bounded database indicator (extension point already reserved); R7 boot discipline reworded: startup MUST NOT eagerly connect but a configured database dependency IS permitted; liveness stays dependency-free. monorepo-workspace untouched |

## Locked conventions from TECH-DESIGN/ADRs (binding)

- `apps/api` owns Prisma + maintenance command (TD §3.4); packages/config and apps/web never touch PostgreSQL
- Runtime connection uses platform pool; migrations use direct connection (TD §12.3)
- Versioned migrations in the monorepo define schema/constraints (ADR-0006)
- Prisma ORM as PostgreSQL client + primary migration tool (ADR-0007); explicit SQL when Prisma can't express a constraint; never destructive auto-sync in shared/prod envs
- Migrations run once as controlled release step before promoting the API version, never concurrently at replica startup (ADR-0008)
- Health: live=process, ready=indispensable deps with timeout (TD §11)

## Scope boundary (binding)

IN: prisma setup in apps/api (schema.prisma datasource+generator), exact deps, env schema extension (DATABASE_URL), lazy client seam + module wiring, readiness DB indicator, empty baseline migration committed, offline verification suite, .env.example names, gitignore for generated output. OUT: ALL domain tables/relations (#5–#9), money/decimal, seed data (#6), endpoints/business logic, Supabase/Railway provisioning (#11), release automation, OpenAPI (#10), Prisma 7/8 migration.

## Known blocker (surfaced to user at end of session)

Live migration verification requires a disposable PostgreSQL (local install or Docker). Until then the reproducible-migration acceptance stays a RECORDED PENDING GATE inside this change's artifacts.
