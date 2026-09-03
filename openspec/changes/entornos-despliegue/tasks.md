# Tasks: Deployment Environments

## Review Workload Forecast

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

| Field | Value |
|---|---|
| Estimated changed lines | 700–800+ (configs ~60, workflows ~180, SQL ~60, docs ~250–350, templates ~30, tests ~150–200) |
| Suggested split | One cohesive local-only work unit under approved `size:exception`; no remote PR chain |
| Delivery strategy | ask-on-risk |

### Suggested Work Units

| Unit | Goal | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| 1 | Complete all six phases as one cohesive unit | `npm test` plus quality gates | N/A: cloud execution is explicitly pending | Revert the single commit |

## Phase 1: Provider Configs

- [x] 1.1 Create `vercel.json`, `apps/api/railway.json`, and `supabase/bootstrap.sql` exactly as designed: roots, commands, Node/health settings, private rerunnable bucket and service-role policies.
- [x] 1.2 Validate provider JSON/TOML parseability and static SQL safety (no credentials, public policies, or destructive non-idempotent bootstrap).

## Phase 2: Workflows

- [x] 2.1 RED: scan intended workflow/config/env/doc targets for credential literals and unsafe secret interpolation without echoing findings.
- [x] 2.2 Modify `.github/workflows/quality.yml` with `workflow_call` and deployment validation while preserving existing behavior.
- [x] 2.3 Create `.github/workflows/deploy-production.yml` with reusable quality `needs`, `production-release` concurrency, migration once → optional input-gated seed → Railway → Vercel → smoke ordering, and names-only secrets.
- [x] 2.4 Create `.github/workflows/preview.yml` with auditable missing-secret SKIP, isolated resources only, and no production references.

## Phase 3: Env Templates and Docs

- [x] 3.1 Extend `apps/api/.env.example` with six consumed names and dated commented future names; create names-only `apps/web/.env.example`.
- [x] 3.2 Create `docs/environments.md` with the local/preview/production × API/web classification matrix and isolation rules.
- [x] 3.3 Create `docs/deployment.md` with provider provisioning, exact secret names, branch protection, migration/seed evidence closure, rollback, and six pending gates with closure conditions.

## Phase 4: Static Validation Tests

- [x] 4.1 Add root `yaml` devDependency and `test:deployment` script; create `tests/deployment-config.spec.mjs`.
- [x] 4.2 Assert JSON/YAML parsing, release order/concurrency, preview SKIP/isolation, secret absence with marked placeholder allowance, private rerunnable SQL, and required runbook chapters; run `npm test`.

## Phase 5: Verification Gates and Commit

- [x] 5.1 Run `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run build`, `npm run contract:check`, and existing contract compatibility checks.
- [x] 5.2 RED: rescan every file this change creates or modifies for secrets/literals, allowing only clearly marked placeholders.
- [x] 5.3 RED commit-state: explicitly stage only provider configs, workflows, env templates, docs, tests, lockfile, and change artifacts; create exactly `chore: add environments and deployment configuration`, never `commit -a` or push, then verify a clean tree.

## Phase 6: Records

- [x] 6.1 Create `openspec/changes/entornos-despliegue/apply-progress.md` with delivery/work-unit evidence, `STATIC` labels, final authored count, the verbatim PENDING GATES — Supabase project; Railway service; Vercel app provisioning; live PostgreSQL apply → re-apply → status plus seed evidence; branch protection application; deploy/preview live execution — and the `size:exception` statement.
