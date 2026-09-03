# Design: Deployment Environments

## Technical Approach

Implement repository-owned provider configuration, a reusable quality gate, one serialized production release, and an honest PR-preview validator. Supabase metadata stays outside Prisma migrations; only the API receives privileged runtime values. The design satisfies all 10 requirements and 20 scenarios while retaining the six live gates as pending.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Vercel repository root vs `apps/web` root | Root uses the workspace lockfile; app root needs a second install boundary. | Repository root, `npm ci`, `npm run build:web`; Node comes from existing `.nvmrc`/root `engines`. |
| Railway root vs monorepo watch paths | App root gives `dist/main.js`; root commands need awkward output paths. | Railway service root `apps/api`; config is `apps/api/railway.json`, with root-lockfile commands. |
| Quality reuse vs duplicated steps | Reuse prevents drift and makes `needs` a hard precondition. | Add `workflow_call` to existing `quality.yml`; production calls it. |
| Railway CLI vs REST | CLI is conventional and keeps provider payload details out of YAML. | Pinned during implementation; invoke `railway up --service ... --environment production --ci`. |
| Current env names vs future Supabase names | Over-declaring creates drift because auth/storage/BFF are not implemented. | Template only six consumed API names; future names are commented and dated to #12+; omit `SUPABASE_URL`/`SUPABASE_ANON_KEY` until an implemented #12+ adapter consumes them. |

## Data Flow

```text
PR -> quality.yml -> preview preflight -> provider-native isolated previews -> summary
main dispatch -> reusable quality -> DIRECT_URL migration once -> Railway API -> Vercel web -> three smoke GETs
Supabase SQL editor -> private bucket/policies; API service role -> signed URLs
```

```text
GitHub dispatch -> quality (pass) -> release lock -> migrate once -> Railway -> Vercel -> smoke (pass)
                                      \-> failure: stop; no later promotion
```

## File Changes

| File | Action | Description |
|---|---|---|
| `vercel.json`, `apps/api/railway.json`, `supabase/bootstrap.sql` | Create | Provider commands, health check, Node/runtime boundary, private storage bootstrap. |
| `.github/workflows/quality.yml` | Modify | Add `workflow_call` and deployment static-test step; preserve existing gates. |
| `.github/workflows/deploy-production.yml`, `.github/workflows/preview.yml` | Create | Ordered release and isolated-preview preflight/annotation. |
| `apps/api/.env.example`, `apps/web/.env.example`, `docs/environments.md`, `docs/deployment.md` | Modify/Create | Honest templates, matrix, provisioning/runbook/evidence. |
| `tests/deployment-config.spec.mjs`, root `package.json`/lockfile | Create/Modify | Vitest + `yaml` parser static validation and script. |

## Normative Provider Files

### `vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "version": 2,
  "framework": "nextjs",
  "installCommand": "npm ci",
  "buildCommand": "npm run build:web",
  "outputDirectory": "apps/web/.next"
}
```

The Vercel project uses repository root as its Root Directory. No environment values are committed; project settings supply them. Root `engines.node` (`^24.0.0`) and `.nvmrc` (`24.15.0`) pin the runtime.

### `apps/api/railway.json`

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm ci --prefix ../.. && npm --prefix ../.. run prisma:generate --workspace=@repara/api && npm --prefix ../.. run build:api"
  },
  "deploy": {
    "startCommand": "node dist/main.js",
    "healthcheckPath": "/health/ready",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### `supabase/bootstrap.sql`

```sql
-- Provider bootstrap, not a Prisma domain migration.
-- Re-runnable: bucket upsert and guarded policy creation are intentional.

insert into storage.buckets (id, name, public)
values ('request-images', 'request-images', false)
on conflict (id) do update set name = excluded.name, public = false;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'request-images service role select') then
    create policy "request-images service role select" on storage.objects for select to service_role using (bucket_id = 'request-images');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'request-images service role insert') then
    create policy "request-images service role insert" on storage.objects for insert to service_role with check (bucket_id = 'request-images');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'request-images service role update') then
    create policy "request-images service role update" on storage.objects for update to service_role using (bucket_id = 'request-images') with check (bucket_id = 'request-images');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'request-images service role delete') then
    create policy "request-images service role delete" on storage.objects for delete to service_role using (bucket_id = 'request-images');
  end if;
end $$;
```

## Normative Workflows

### `.github/workflows/quality.yml` (preserve existing steps; additions shown in complete file)

```yaml
name: quality

on:
  workflow_call:
  push:
    branches: [main]
  pull_request:

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - name: Pin npm 12
        run: npm install --global npm@12.0.1
      - name: Install
        run: npm ci
      - name: Lint
        run: npm run lint
      - name: Format check
        run: npm run format:check
      - name: Typecheck
        run: npm run typecheck
      - name: Test
        run: npm test
      - name: Contract gate
        run: npm run contract:check
      - name: Contract compatibility
        run: npm run contract:diff
      - name: Build
        run: npm run build
      - name: Deployment static validation
        run: npm run test:deployment
```

### `.github/workflows/deploy-production.yml`

```yaml
name: deploy-production

on:
  workflow_dispatch:
    inputs:
      seed:
        description: Run the idempotent catalog seed for bootstrap/first release only
        required: false
        default: false
        type: boolean

permissions:
  contents: read

jobs:
  quality-reuse:
    uses: ./.github/workflows/quality.yml

  release:
    needs: quality-reuse
    if: github.ref == 'refs/heads/main' && github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    concurrency:
      group: production-release
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - name: Pin npm 12
        run: npm install --global npm@12.0.1
      - name: Install
        run: npm ci
      - name: Generate Prisma client
        run: npm run prisma:generate --workspace=@repara/api
      - name: Apply Prisma migrations once
        env:
          DIRECT_URL: ${{ secrets.PRODUCTION_DIRECT_URL }}
        run: |
          if [ -z "$DIRECT_URL" ]; then echo "::error::PRODUCTION_DIRECT_URL is missing"; exit 1; fi
          echo "::add-mask::$DIRECT_URL"
          npm run prisma:migrate:deploy --workspace=@repara/api
      - name: Seed catalog (bootstrap only)
        if: inputs.seed == true
        env:
          DIRECT_URL: ${{ secrets.PRODUCTION_DIRECT_URL }}
        run: |
          echo "::add-mask::$DIRECT_URL"
          npm run prisma:seed --workspace=@repara/api
      - name: Promote API on Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
          RAILWAY_SERVICE_ID: ${{ secrets.RAILWAY_SERVICE_ID }}
        run: |
          echo "::add-mask::$RAILWAY_TOKEN"
          npx --yes @railway/cli@latest up --service "$RAILWAY_SERVICE_ID" --environment production --ci
      - name: Deploy web on Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: |
          echo "::add-mask::$VERCEL_TOKEN"
          npx --yes vercel@latest deploy --prod --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID"
      - name: Smoke checks
        env:
          API_ORIGIN: ${{ vars.PRODUCTION_API_ORIGIN }}
          WEB_ORIGIN: ${{ vars.PRODUCTION_WEB_ORIGIN }}
        run: |
          node <<'NODE'
          (async () => {
            const checks = [
              ['api-live', `${process.env.API_ORIGIN}/health/live`],
              ['api-ready', `${process.env.API_ORIGIN}/health/ready`],
              ['web', process.env.WEB_ORIGIN],
            ];
            for (const [name, url] of checks) {
              const response = await fetch(url);
              if (response.status !== 200) throw new Error(`${name} returned ${response.status}`);
            }
          })().catch((error) => {
            console.error(error.message);
            process.exitCode = 1;
          });
          NODE
```

### `.github/workflows/preview.yml`

```yaml
name: preview

on:
  pull_request:

permissions:
  contents: read

jobs:
  preflight:
    runs-on: ubuntu-latest
    outputs:
      proceed: ${{ steps.credentials.outputs.proceed }}
    steps:
      - id: credentials
        name: Check isolated preview credentials
        env:
          SUPABASE_PREVIEW_URL: ${{ secrets.SUPABASE_PREVIEW_URL }}
          SUPABASE_PREVIEW_SERVICE_KEY: ${{ secrets.SUPABASE_PREVIEW_SERVICE_KEY }}
          SUPABASE_PREVIEW_DATABASE_URL: ${{ secrets.SUPABASE_PREVIEW_DATABASE_URL }}
          SUPABASE_PREVIEW_DIRECT_URL: ${{ secrets.SUPABASE_PREVIEW_DIRECT_URL }}
          SUPABASE_PREVIEW_BUCKET_NAME: ${{ secrets.SUPABASE_PREVIEW_BUCKET_NAME }}
          RAILWAY_PREVIEW_TOKEN: ${{ secrets.RAILWAY_PREVIEW_TOKEN }}
          RAILWAY_PREVIEW_SERVICE_ID: ${{ secrets.RAILWAY_PREVIEW_SERVICE_ID }}
          VERCEL_PREVIEW_TOKEN: ${{ secrets.VERCEL_PREVIEW_TOKEN }}
          VERCEL_PREVIEW_ORG_ID: ${{ secrets.VERCEL_PREVIEW_ORG_ID }}
          VERCEL_PREVIEW_PROJECT_ID: ${{ secrets.VERCEL_PREVIEW_PROJECT_ID }}
          PREVIEW_RESOURCE_CLASS: ${{ vars.PREVIEW_RESOURCE_CLASS }}
          PREVIEW_API_ORIGIN: ${{ vars.PREVIEW_API_ORIGIN }}
          PREVIEW_WEB_ORIGIN: ${{ vars.PREVIEW_WEB_ORIGIN }}
        run: |
          missing=0
          for name in SUPABASE_PREVIEW_URL SUPABASE_PREVIEW_SERVICE_KEY SUPABASE_PREVIEW_DATABASE_URL SUPABASE_PREVIEW_DIRECT_URL SUPABASE_PREVIEW_BUCKET_NAME RAILWAY_PREVIEW_TOKEN RAILWAY_PREVIEW_SERVICE_ID VERCEL_PREVIEW_TOKEN VERCEL_PREVIEW_ORG_ID VERCEL_PREVIEW_PROJECT_ID PREVIEW_API_ORIGIN PREVIEW_WEB_ORIGIN; do
            value="${!name:-}"
            if [ -z "$value" ]; then missing=1; else echo "::add-mask::$value"; fi
          done
          if [ "$PREVIEW_RESOURCE_CLASS" != "isolated" ]; then missing=1; fi
          if [ "$missing" -ne 0 ]; then
            echo "PREVIEW SKIPPED (no preview credentials)"
            echo "### PREVIEW SKIPPED (no preview credentials)" >> "$GITHUB_STEP_SUMMARY"
            echo "proceed=false" >> "$GITHUB_OUTPUT"
            exit 0
          fi
          echo "proceed=true" >> "$GITHUB_OUTPUT"

  provider-preview-validation:
    needs: preflight
    if: needs.preflight.outputs.proceed == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - name: Validate and annotate provider-native previews
        env:
          PREVIEW_API_ORIGIN: ${{ vars.PREVIEW_API_ORIGIN }}
          PREVIEW_WEB_ORIGIN: ${{ vars.PREVIEW_WEB_ORIGIN }}
        run: |
          npm run test:deployment
          {
            echo "### Provider-native isolated preview wiring"
            echo "Railway and Vercel integrations are expected to create the PR URLs."
            echo "API preview: $PREVIEW_API_ORIGIN"
            echo "Web preview: $PREVIEW_WEB_ORIGIN"
          } >> "$GITHUB_STEP_SUMMARY"
```

## Environment Templates and Matrix

```dotenv
# apps/api/.env.example — consumed by the current API
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info
DATABASE_URL=
DIRECT_URL=

# Future server-only names; introduced by #12+ auth/storage adapters, not consumed today.
# AUTH_ISSUER_URL=
# AUTH_JWKS_URL=
# STORAGE_SERVICE_KEY=
# STORAGE_BUCKET_NAME=
```

```dotenv
# apps/web/.env.example — no variables are consumed by the current web app.
# Future BFF names for #12/#13; keep values in platform settings, never commit them.
# API_ORIGIN=
# NEXT_PUBLIC_APP_ENV=
```

```markdown
| Environment | App | Consumed now | Future/classification |
|---|---|---|---|
| Local | API | NODE_ENV, PORT, HOST, LOG_LEVEL, DATABASE_URL, DIRECT_URL | AUTH_ISSUER_URL, AUTH_JWKS_URL, STORAGE_SERVICE_KEY, STORAGE_BUCKET_NAME (#12+) |
| Preview | API | Same six names, isolated values only | Same four server-only names (#12+); never live resources |
| Production | API | Same six names, pooled DATABASE_URL and direct DIRECT_URL | Same four server-only names (#12+); never Vercel |
| Local | Web | None | API_ORIGIN, NEXT_PUBLIC_APP_ENV (#12/#13) |
| Preview | Web | None | API_ORIGIN, NEXT_PUBLIC_APP_ENV (#12/#13), non-privileged only |
| Production | Web | None | API_ORIGIN, NEXT_PUBLIC_APP_ENV (#12/#13), no DB/storage credentials |
```

## Runbook (`docs/deployment.md`)

```markdown
# Deployment Runbook

## 1. Supabase provisioning
Create separate development, preview, and production projects. In each SQL Editor, run `supabase/bootstrap.sql`; verify bucket `request-images` is private and policies target only `service_role`. Obtain the transaction-pool URL for `DATABASE_URL` and direct URL for `DIRECT_URL`; store neither in Git.

## 2. Railway provisioning
Create/connect the API service, set Root Directory to `apps/api`, select `apps/api/railway.json`, pin Node 24, disable native production auto-deploy, and configure the service health check. Set platform secrets from the matrix; do not add migration commands to startup.

## 3. Vercel provisioning
Create/link the web project with repository Root Directory `.` and `vercel.json`; configure the Node engine and only non-privileged web values. Configure PR preview integration to use preview values, never live values.

## 4. GitHub administration
Protect `main`; require pull requests, approvals, and the `quality` status check; forbid force-push and branch deletion. Create GitHub production/preview environments and secrets `PRODUCTION_DIRECT_URL`, `RAILWAY_TOKEN`, `RAILWAY_SERVICE_ID`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `SUPABASE_PREVIEW_URL`, `SUPABASE_PREVIEW_SERVICE_KEY`, `SUPABASE_PREVIEW_DATABASE_URL`, `SUPABASE_PREVIEW_DIRECT_URL`, `SUPABASE_PREVIEW_BUCKET_NAME`, `RAILWAY_PREVIEW_TOKEN`, `RAILWAY_PREVIEW_SERVICE_ID`, `VERCEL_PREVIEW_TOKEN`, `VERCEL_PREVIEW_ORG_ID`, and `VERCEL_PREVIEW_PROJECT_ID`. Add variables `PRODUCTION_API_ORIGIN`, `PRODUCTION_WEB_ORIGIN`, `PREVIEW_RESOURCE_CLASS=isolated`, `PREVIEW_API_ORIGIN`, and `PREVIEW_WEB_ORIGIN`.

## 5. Migration and seed evidence
Evidence-closure procedure (run in the target environment; static checks do not close this gate):
1. `npm run prisma:migrate:deploy --workspace=@repara/api`
2. `npm run prisma:migrate:status --workspace=@repara/api`
3. Re-apply idempotency: `npm run prisma:migrate:deploy --workspace=@repara/api`
4. `npm run prisma:seed --workspace=@repara/api`
5. Query and record category/district counts, timestamps, exit codes, migration status, and complete command output in the protected release evidence record.

## 6. Rollback
Redeploy the previous Railway release, roll Vercel back to the prior deployment, and record whether a forward migration is required; never assume application rollback reverses a Prisma migration. Revert this single commit for repository rollback.

## 7. Pending gates
1. Supabase project — close after project, private bucket, policies, and pool/direct URLs are evidenced.
2. Railway service — close after service settings and healthy `/health/ready` evidence.
3. Vercel app — close after linked project and non-privileged settings evidence.
4. PostgreSQL migration/seed gate — close only after apply, status, re-apply, seed, counts, and required later database evidence.
5. GitHub branch protection — close after an administrator records the rules and passing `quality` check.
6. Live deploy/preview workflows — close after successful production ordering, smoke checks, and isolated PR preview evidence.
```

## Static Validation Tests (Plan)

Add root devDependency `yaml` and `test:deployment: vitest run tests/deployment-config.spec.mjs`; parse JSON with `JSON.parse` and YAML with `yaml.parse`. The spec reads all six named config/workflow/docs files and asserts: release `needs` quality, migration < Railway < Vercel < smoke, concurrency group/cancellation, preview preflight skip summary and no live-resource tokens, and required runbook chapters. It derives the production bucket name from bootstrap and asserts preview text contains neither that name nor `PRODUCTION_*` resource identifiers. Scan tracked workflow/config/env candidates for credential-like URL/key literals; allow blank values, `${{ secrets.NAME }}`, `${NAME}`, `YOUR_...`, and `<token>` placeholders, but never echo findings. Assert `supabase/bootstrap.sql` has no credentials, no public policies, and is re-runnable.

## Threat Matrix

| Boundary | Applicability | Safe/failure behavior and RED test |
|---|---|---|
| Shell/workflow commands | Applicable — secrets cross CI shell boundaries. | Mask values, names-only files, no `set -x`; RED rejects literal credentials and unsafe secret interpolation. |
| Documentation-like paths | N/A — no path is executed or classified as a program. | No execution test. |
| Git repository selection | N/A — Actions checkout supplies the fixed workspace; no `git -C` or user path. | No selector fallback. |
| Commit state | N/A — commit/revert is apply-owned. | No staging/commit automation. |
| Push state | N/A — workflows do not push. | No destination/ref logic. |
| PR commands | N/A — `pull_request` is only a trigger; no PR command composition. | No PR command test. |
| Secrets boundary | Applicable — provider and database secrets are referenced. | Missing preview secrets skips; production migration fails before promotion; RED scans names/values. |
| SQL injection | N/A — bootstrap is fixed DDL and fixed policy predicates. | No user input; parse and policy assertions only. |

## Migration / Rollout

Single commit; nothing is deployed. Rollback is revert. Live provisioning, migration evidence, branch protection, and workflow execution remain pending.

## Open Questions

None expected.
