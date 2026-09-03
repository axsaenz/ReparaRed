# Pre-Proposal State — gentle-ai.sdd-preproposal/v1

- revision: 1
- status: confirmed
- exploration: `openspec/changes/entornos-despliegue/exploration.md`
- research: unselected
- proposal_ready: true
- confirmed_by: orchestrator (auto mode mandate 2026-09-01 — recommended options auto-selected)

## Confirmed product decisions

| # | Decision | Confirmed value |
|---|----------|-----------------|
| 1 | release_workflow | `github-controlled-serialized-release` — quality+contract as hard prerequisite; concurrency-grouped production release job: `prisma migrate deploy` once with DIRECT_URL → API promotion → web deploy → smoke checks (health live/ready + web) without logging secrets; NEVER provider-native production auto-deploy (would race the migration gate) |
| 2 | preview_model | `provider-native-with-isolation-preflight` — Vercel PR previews + Railway isolated preview services ONLY with non-production Supabase project/bucket; secrets-presence preflight SKIPS with auditable reason when preview secrets absent — never falls back to production resources |
| 3 | migration_seed | `bootstrap-time-seed` — idempotent catalog seed at initial environment bootstrap or explicitly approved release step; NEVER at replica startup; runbook includes apply/re-apply/status/seed evidence to close the pending live gate |
| 4 | provider_config_form | `conventional-files-plus-runbook` — `vercel.json` + `railway.json` for conventional settings (build/start commands, health check /health/ready, Node pin); Supabase via versioned bootstrap SQL/runbook (private bucket + policies; NO Prisma ownership of provider metadata); settings not representable as code → runbook steps |
| 5 | env_names | `preserve-existing-freeze-new` — keep DATABASE_URL/DIRECT_URL/NODE_ENV/PORT/HOST/LOG_LEVEL exactly; freeze new SERVER-ONLY names in spec (Supabase Auth/JWKS credentials, Storage service credentials, private bucket name, API origin for BFF); public NEXT_PUBLIC_* limited to non-privileged values only; full env matrix local/preview/production documented |
| 6 | branch_protection | `runbook-owned` — GitHub admin checklist in runbook: protect main, require PRs + quality status check, disallow force-push/deletion (cannot be enforced by repo file — recorded as provisioning-time gate) |

## Locked constraints (binding, verbatim from TECH-DESIGN §12 + ADR-0008/0011/0012)

- Separate environments: development, preview, production; NO preview uses production database or bucket (TD §12.1).
- Migrations run ONCE as controlled release step before API promotion, never concurrently at replica startup (ADR-0008/TD §12.2).
- Vercel receives NO privileged PostgreSQL/Storage credentials (TD §12.3).
- Runtime connection = platform transaction pool; migrations = direct connection (TD §12.3).
- Images in private Supabase Storage bucket with short-lived signed URLs (ADR-0012).
- Browser talks only to same origin (BFF); Next.js forwards short-lived bearer (ADR-0011).

## Capability impact (binding)

NEW capability `deployment-environments` (config-as-code, env matrices, release/preview workflows, runbooks, static validation, pending-gate records). No modifications to existing capabilities.

## Scope boundary (binding)

IN: vercel.json, railway.json, supabase bootstrap SQL/runbook, deploy+preview workflows (.github/workflows/), env templates (.env.example per app, names-only) + env matrix docs, deployment runbook (provisioning, secrets matrix, branch protection, rollback, pending-gate closure), static validation tests (YAML/JSON parse, workflow structure assertions, secret-absence scans, preview-isolation assertions). OUT: actual cloud provisioning (PENDING GATES — user accounts required), runtime secrets, DNS/domains, monitoring/alerting, auth flows (#12/#13), BFF implementation (#12+), image upload behavior (#19/#20), Prisma schema changes.

## Carried forward (binding)

Live PostgreSQL gate (migrations #1–#5 apply→re-apply→status + seed + triggers/concurrency) remains UNSATISFIED — closes when Supabase project exists (this item's runbook defines the closure procedure but cannot execute it). UBIGEO best-effort unchanged.
