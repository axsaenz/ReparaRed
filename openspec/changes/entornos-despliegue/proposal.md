# Proposal: Configure Environments and Deployment

## Intent
- Configure Supabase (PostgreSQL/Auth/Storage), Railway API, and Vercel web as config-as-code.
- Enforce GitHub-controlled serialized production releases, isolated previews, and runbooks per TECH-DESIGN §12 and ADR-0008.
- This proposal does not claim cloud provisioning or deployment readiness.

## Scope
### In Scope
- `vercel.json`; `railway.json`; versioned Supabase bootstrap SQL and Storage policies.
- Production and PR workflows, names-only environment templates, local/preview/production × API/web matrix, and `docs/deployment.md`.
- Offline static validation for JSON/YAML, workflow ordering/concurrency, secret absence, and preview isolation.

### Out of Scope
- Cloud accounts/projects/services, runtime secrets, DNS/domains, monitoring, or live execution.
- Auth flows, BFF implementation, image-upload behavior, Prisma changes, or provider-managed metadata ownership by Prisma.

## Capabilities
### New Capabilities
- `deployment-environments`: config-as-code, environment matrices, release/preview workflows, runbooks, static validation, and pending-gate records.

### Modified Capabilities
- None.

## Approach
- `vercel.json`: web root/build, no privileged env. `railway.json`: API root, `npm ci` + `prisma generate` + build, `node dist/main.js`, `/health/ready`, Node 24.
- `supabase/bootstrap.sql` plus runbook create/version the private image bucket and Storage policies; Prisma does not own provider metadata.
- `.github/workflows/deploy-production.yml`: protected-main `workflow_dispatch`/tag; reuse quality → serialized migrate once with `DIRECT_URL` → Railway API/CLI promote → Vercel deploy → smoke `/health/live`, `/health/ready`, web URL; never log secrets. `.github/workflows/preview.yml`: PR secret preflight → provider-native isolated non-production Supabase previews; absent secrets = auditable SKIP, never production.
- `apps/web/.env.example` is names-only, including BFF API origin; extend `apps/api/.env.example` with frozen server-only Auth/JWKS, Storage, and bucket names. Document the matrix table; `docs/deployment.md` owns exact provisioning, secrets, branch protection, rollback, and gate evidence.

## Recorded Pending Gates (all unsatisfied)
1. Supabase project; 2. Railway service; 3. Vercel app provisioning (accounts required; runbook chapters define exact steps).
4. Live PostgreSQL apply → re-apply → status plus seed evidence per the runbook procedure.
5. GitHub-admin branch protection; 6. Live deploy/preview workflow execution.
Static validation only; deployment readiness MUST NOT be claimed.

## Affected Areas
| Area | Impact | Description |
|---|---|---|
| `vercel.json`, `railway.json`, `supabase/bootstrap.sql` | New | Provider config and bootstrap. |
| `.github/workflows/` | New | Production and preview workflows. |
| `apps/web/.env.example`, `apps/api/.env.example`, `docs/deployment.md` | Modified/New | Templates, matrix, runbook. |
| `tests/` | New | Static config/workflow, secret, preview DB/bucket assertions. |

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Native auto-deploy races migration | Med | Disable per runbook; assert release ordering. |
| Preview reaches production | Med | Preflight and production-name isolation assertions. |
| Secret leakage | Med | Names-only files and tracked-file scans. |
| Provider/runbook drift | Med | Conventional files and provisioning checklist. |
| Branch protection unenforceable as code | High | GitHub-admin checklist; pending gate. |
| Stale planning-only config note | Low | Do not modify `openspec/config.yaml`. |

## Rollback Plan
- Revert the single commit; configs, workflows, runbook, and tests disappear. Nothing is deployed, so runtime impact is zero.

## Dependencies
- #2 and #10 are archived; #12+ consumers follow later. No external services are reachable.

## Success Criteria
- [ ] Configs parse; workflow assertions prove order, concurrency, isolation, and skip path.
- [ ] Secret scans are clean; the env matrix is complete and names-only.
- [ ] Runbook includes provisioning, branch protection, rollback, and live-gate closure.
- [ ] Offline quality gates pass; all six cloud/live gates remain explicitly unsatisfied.
