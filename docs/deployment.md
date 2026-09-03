# Deployment Runbook

This runbook describes repository-owned configuration and the evidence needed
to provision ReparaRed. It does not provision cloud resources and it does not
claim deployment readiness. Complete each step in the target environment,
record the evidence in the protected release record, and keep credentials out
of Git and logs.

## 1. Supabase provisioning

Create separate development, preview, and production Supabase projects. Do
not reuse a production project for a pull-request preview. Give the project a
human-readable environment label and record the project URL in the protected
environment record, not in this repository.

For each project:

1. Open the SQL Editor with an administrator account.
2. Review `supabase/bootstrap.sql` at the commit being deployed.
3. Execute the complete file.
4. Execute it a second time to verify rerunnable behavior.
5. Confirm that bucket `request-images` exists with `public = false`.
6. Confirm that the four object policies are scoped to `service_role` and the
   `request-images` bucket.
7. Confirm that no anonymous or public object policy was added.
8. Record the commit, execution timestamps, policy names, bucket privacy, and
   SQL Editor success output as provisioning evidence.

Create a transaction-pool connection for the API runtime and a direct
PostgreSQL connection for Prisma migration operations. Set `DATABASE_URL` to
the pooled value and `DIRECT_URL` to the direct value in the target API
environment. Store both as server-only secrets. Never paste either value into
an example file, issue, workflow log, or deployment comment.

The bootstrap is provider metadata, not a Prisma domain migration. Prisma
migrations remain owned by `apps/api/prisma/migrations`; do not copy bucket or
Storage policy statements into a domain migration. Use signed object access
when the later storage adapter is implemented.

## 2. Railway provisioning

Create one Railway API service for each environment class that will be
deployed. Link the service to this repository and select the intended branch or
provider preview integration. For the API service:

1. Set the service Root Directory to `apps/api`.
2. Select `apps/api/railway.json` as the repository configuration.
3. Confirm that the service build uses the repository root lockfile.
4. Confirm that Node 24 is selected; `.nvmrc` is `24.15.0` and the root
   `engines.node` range is `^24.0.0`.
5. Confirm the start command is `node dist/main.js`.
6. Configure `/health/ready` as the Railway health check.
7. Disable native production auto-deploy so the GitHub release workflow owns
   production promotion.
8. Do not add Prisma migration or seed commands to the start command.
9. Set the six current API variables from the environment matrix, with
   pooled/direct connection roles preserved.
10. Add future auth and storage names only when their implementation is
    merged and the matrix has been updated.

For the production service, record the service identifier, configuration
revision, health-check result, environment assignment, and the commit that
was deployed. The GitHub release job receives the service identifier through a
secret named `RAILWAY_SERVICE_ID` and the provider credential through
`RAILWAY_TOKEN`; values are never written here.

## 3. Vercel provisioning

Create one Vercel project for the web application and link it to this
repository. Configure:

1. Root Directory: repository root (`.`).
2. Configuration file: `vercel.json`.
3. Install command: `npm ci`.
4. Build command: `npm run build:web`.
5. Output directory: `apps/web/.next`.
6. Node runtime compatible with `.nvmrc` and the root engine range.
7. Only non-privileged web values in project settings.
8. Preview values connected to isolated preview resources.

Never add `DATABASE_URL`, `DIRECT_URL`, `STORAGE_SERVICE_KEY`, or any other
privileged API value to Vercel. The future BFF origin may be server-only, and
the future environment label may be public; neither is consumed by the
current web application. Record the project identifier, root/build settings,
deployment URL, and environment assignment in provisioning evidence.

## 4. GitHub administration

An administrator must apply these settings; repository files cannot prove
that a GitHub rule is active.

### Branch protection checklist

- [ ] Protect `main`.
- [ ] Require a pull request before merging.
- [ ] Require at least one approving review.
- [ ] Require the `quality` status check to pass before merging.
- [ ] Require branches to be up to date before merging, if supported by the
      repository policy.
- [ ] Forbid force-pushes to `main`.
- [ ] Forbid deletion of `main`.
- [ ] Restrict bypass permissions to the documented administrators.
- [ ] Record a screenshot or API response showing the active rules.

Create GitHub environments named `production` and `preview`. Configure
approval requirements and protected branches for `production` according to
the repository policy. Keep preview credentials isolated from production
credentials.

### GitHub secret names

Create these names only in the appropriate GitHub environment. Do not record
their values in repository files:

| Environment | Secret name |
|---|---|
| Production | `DIRECT_URL` |
| Production | `RAILWAY_TOKEN` |
| Production | `RAILWAY_SERVICE_ID` |
| Production | `VERCEL_TOKEN` |
| Production | `VERCEL_ORG_ID` |
| Production | `VERCEL_PROJECT_ID` |
| Preview | `SUPABASE_PREVIEW_URL` |
| Preview | `SUPABASE_PREVIEW_SERVICE_KEY` |
| Preview | `SUPABASE_PREVIEW_DATABASE_URL` |
| Preview | `SUPABASE_PREVIEW_DIRECT_URL` |
| Preview | `SUPABASE_PREVIEW_BUCKET_NAME` |
| Preview | `RAILWAY_PREVIEW_TOKEN` |
| Preview | `RAILWAY_PREVIEW_SERVICE_ID` |
| Preview | `VERCEL_PREVIEW_TOKEN` |
| Preview | `VERCEL_PREVIEW_ORG_ID` |
| Preview | `VERCEL_PREVIEW_PROJECT_ID` |

Create these non-secret environment variable names in GitHub Variables:

* `PRODUCTION_API_ORIGIN`
* `PRODUCTION_WEB_ORIGIN`
* `PREVIEW_RESOURCE_CLASS`, which MUST equal `isolated`
* `PREVIEW_API_ORIGIN`
* `PREVIEW_WEB_ORIGIN`

The workflow checks all preview secret and origin names plus the isolated
resource class. If any is absent, it writes `PREVIEW SKIPPED` to the job log
and step summary and exits successfully without selecting a production
resource.

## 5. Production release procedure

Use the `deploy-production` workflow from `main` through `workflow_dispatch`.
Set the seed input to false for normal releases. The workflow first reuses the
quality workflow, then obtains the `production-release` concurrency lock. The
release job applies one migration using `DIRECT_URL`, optionally seeds, then
promotes Railway, deploys Vercel, and performs three HTTP 200 smoke checks:
`/health/live`, `/health/ready`, and the web origin. A missing migration secret
or provider secret fails before the relevant promotion. Do not use shell
tracing or echo credential values.

The catalog seed is an approved bootstrap-only operation. Set `seed` to true
only when the release owner has reviewed the idempotent seed behavior and
requires first-release catalog data. Normal application restarts must not
run migrations or seeds.

## 6. Migration and seed evidence

Evidence-closure procedure (run in the target environment; static checks do not close this gate):

1. `npm run prisma:migrate:deploy --workspace=@repara/api`
2. `npm run prisma:migrate:status --workspace=@repara/api`
3. Re-apply idempotency: `npm run prisma:migrate:deploy --workspace=@repara/api`
4. `npm run prisma:seed --workspace=@repara/api`
5. Query and record category/district counts, timestamps, exit codes, migration status, and complete command output in the protected release evidence record.

This procedure closes the pending live PostgreSQL gate only when it is run
against the target environment with real credentials and its evidence is
reviewed. The static test can verify command ordering and documentation, but
it cannot validate a remote database or counts.

## 7. Preview procedure

Open a pull request and allow `preview.yml` to run. The preflight checks the
preview URL, service key, pooled/direct preview connections, preview bucket,
Railway/Vercel identifiers and tokens, origins, and `PREVIEW_RESOURCE_CLASS`.
All resource names must describe isolated non-production resources.

If any required value is absent, the job must report `PREVIEW SKIPPED (no
isolated preview credentials)` in its log and GitHub step summary. This is an
honest successful skip, not a deployment. Do not fill the missing value with a
production secret and do not bypass the isolation check.

When preflight proceeds, the validation job runs the static deployment tests
and annotates the expected provider-native preview URLs. Record the pull
request, commit, preview URLs, resource identifiers, and smoke evidence after
the provider integrations are actually enabled.

## 8. Rollback

For an application-only failure, stop further promotion and redeploy the
previous known-good Railway release. Roll Vercel back to the prior deployment
using the provider dashboard or CLI. Re-run the API and web smoke checks and
record the release identifiers and results.

Do not assume that rolling back application code reverses a Prisma migration.
If a migration has already been applied, prefer a forward-compatible fix or a
reviewed forward migration. A destructive database rollback requires an
explicit incident decision, backup evidence, and a tested procedure. Never
delete provider metadata as an ad hoc rollback.

For repository rollback, revert the single commit
`chore: add environments and deployment configuration`. Reverting removes the
configuration, workflow, documentation, and static validation changes; it does
not undo a remote migration or deployment. Record both repository and provider
rollback actions in the release record.

## 9. Evidence record template

For every real provisioning or release attempt, capture:

| Evidence | Required contents |
|---|---|
| Source | Commit SHA, workflow run, actor, branch, and timestamp. |
| Quality | Reusable quality run URL and each required gate result. |
| Database | Migration output, status output, re-apply output, seed output, and counts. |
| API | Railway release identifier and live/ready HTTP status. |
| Web | Vercel deployment identifier and web HTTP status. |
| Preview | Pull request, isolated resource class, provider URLs, and skip/proceed result. |
| Administration | Branch-protection response and environment approval settings. |
| Rollback | Previous/current identifiers, decision owner, and verification results. |

Redact secret values while retaining command names, exit codes, timestamps,
status output, and URLs that are safe for the protected evidence location.

## 10. Pending gates

All six gates below are intentionally **PENDING** in this repository because
only static files and offline tests exist. Static validation MUST NOT be
reported as live provisioning or deployment readiness.

1. **Supabase project** — PENDING. Close after development, preview, and
   production project access, private bucket, service-role-only policies, and
   pooled/direct URL evidence are recorded.
2. **Railway service** — PENDING. Close after the API service is linked,
   configured from `apps/api/railway.json`, has no startup migration, and has
   healthy `/health/ready` evidence.
3. **Vercel app provisioning** — PENDING. Close after the repository-linked
   app has the root directory, build settings, non-privileged environment, and
   deployment evidence recorded.
4. **Live PostgreSQL apply → re-apply → status plus seed evidence** — PENDING.
   Close only after the migration/seed evidence-closure procedure above is
   executed with real target credentials, including counts and complete
   evidence.
5. **Branch protection application** — PENDING. Close after a GitHub
   administrator records active `main` protection, pull-request review,
   required `quality`, and force-push/deletion restrictions.
6. **Deploy/preview live execution** — PENDING. Close after a production run
   proves quality → migration → Railway → Vercel → smoke ordering and a pull
   request proves isolated preview behavior or an explicit audited skip.

### Current readiness statement

The repository is configured for a future deployment but is not deployment
ready. No cloud account, project, service, credential, branch rule, migration
evidence, or live workflow execution is asserted by this change.
