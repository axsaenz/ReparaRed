## Exploration: Configure environments and deployment

### Current State

- The repository has a working monorepo foundation with `apps/web`, `apps/api`, `packages/api-client`, and `packages/config`. Root scripts run lint, formatting, typechecking, tests, OpenAPI contract checks, and builds; Node is pinned by `.nvmrc` to `24.15.0` and npm is pinned in `package.json` and `quality.yml` to `12.0.1`.
- `.github/workflows/quality.yml` runs on pull requests and pushes to `main`. It already includes the #10 contract gate (`contract:check` and `contract:diff`) before the build, but there are no deployment workflows.
- The API has only `apps/api/.env.example`. It documents `NODE_ENV`, `PORT`, `HOST`, `LOG_LEVEL`, pooled runtime `DATABASE_URL`, and direct Prisma CLI `DIRECT_URL`; there is no web environment template. `.gitignore` excludes `.env*` except `.env.example`.
- `apps/api/src/config/env.schema.ts` currently validates only the operational foundation variables and permits unknown platform keys. `DATABASE_URL` is optional for offline boot, while `PrismaService` consumes it at runtime. `schema.prisma` and the seed use `DIRECT_URL`, so the pool/direct split is already an implementation constraint.
- `/health/live` and `/health/ready` are deliberately unversioned through the global-prefix exclusions. Liveness checks no dependencies; readiness checks the foundation and, when `DATABASE_URL` is configured, a timed `SELECT 1`. Existing unit and integration tests cover safe 503 behavior and secret-free error bodies.
- Five ordered Prisma migrations are present: the empty baseline, identity/profiles, requests/images, quotes, and services/reviews. `apps/api/prisma/seed.ts` performs an idempotent catalog seed through `DIRECT_URL`. The archived #4, #6, #9, and #10 state records all identify the live PostgreSQL gate (apply, re-apply/idempotency, status, seed, and later trigger/concurrency proof) as unsatisfied.
- No `vercel.json`, `railway.json`/`railway.toml`, or `supabase/config.toml` exists. No Vercel, Railway, or Supabase CLI is declared in the package manifests or lockfile; offline exploration therefore cannot validate provider schemas, accounts, credentials, or live deployments. There is no `docs/` directory and the README is only a product introduction.
- The active change state records Supabase, Railway, and Vercel accounts as pending external blockers. The resolved strategy is local/config-as-code plus runbooks, with actual provisioning and live PostgreSQL-gate closure recorded as pending gates.

### Locked Decisions

The following decisions are quoted verbatim and constrain the proposal:

> “Como mínimo existirán entornos separados de desarrollo, prueba/preview y producción. Ningún preview usará la base o bucket de producción.” — `TECH-DESIGN.md` §12.1

> “Ejecutar migraciones una sola vez como release job de la API.” — `TECH-DESIGN.md` §12.2

> “Las migraciones Prisma se ejecutarán una sola vez como paso controlado de release antes de promover la nueva versión de la API, y no de forma concurrente al iniciar cada réplica.” — `adrs/0008-despliegue-en-vercel-y-railway.md`

> “Vercel no recibe credenciales privilegiadas de PostgreSQL o Storage.” — `TECH-DESIGN.md` §12.3

> “La conexión de runtime usa el pool compatible con transacciones de la plataforma; migraciones usan la conexión directa indicada por Supabase.” — `TECH-DESIGN.md` §12.3

> “Las imágenes se almacenarán en un bucket privado de Supabase Storage y se transferirán mediante URLs firmadas de corta duración.” — `adrs/0012-imagenes-privadas-con-urls-firmadas.md`

> “El navegador se comunicará únicamente con su mismo origen para iniciar o cerrar sesión y para consumir datos privados.” — `adrs/0011-nextjs-como-bff-de-sesion.md`

### Affected Areas

- `apps/api/.env.example` and a new `apps/web/.env.example` — names-only templates and an environment matrix for local, preview, and production; exact new Auth/Storage names must be frozen in the spec.
- `apps/api/src/config/env.schema.ts`, `app-config.service.ts`, and `prisma/schema.prisma` — preserve the existing runtime `DATABASE_URL` versus migration/seed `DIRECT_URL` contract and add only the server-side provider variables required by implemented API adapters.
- `vercel.json` — web project/build configuration, with the repository root or `apps/web` root chosen consistently with Vercel project settings.
- `railway.json` or equivalent Railway service settings — API build/start command, Node version, health check `/health/ready`, restart policy, and monorepo watch/root settings. Provider schema validation remains a provisioning-time gate.
- `supabase/` bootstrap/configuration and a runbook — private image bucket, Storage policy/bootstrap instructions, Auth configuration, region choice, and separation of provider configuration from Prisma domain migrations. Avoid direct ownership of provider-managed tables unless the chosen Supabase mechanism supports it.
- `.github/workflows/quality.yml` and new deployment workflows — preserve the existing quality and contract gates, add protected-`main` production release ordering, and add PR preview behavior without allowing production resources.
- `docs/` or a deployment section in `README.md` — provisioning, environment/secrets matrix, branch-protection checklist, preview setup, rollback, and pending-gate closure steps.
- Static validation tests/scripts — parse or schema-check JSON/YAML/TOML where a pinned parser/tool is available, assert required workflow jobs and paths, scan tracked files for secret/credential literals, and verify that no preview configuration names production database or bucket resources.
- `apps/api/prisma/migrations/*` and `apps/api/prisma/seed.ts` — release and bootstrap jobs must invoke the existing migration/seed commands through environment-injected secrets, never URL literals.

### Boundary

**In scope:** configuration-as-code, names-only environment templates, environment matrices, GitHub workflows, protected-branch and provider runbooks, private Storage bootstrap/policy instructions, static configuration validation, secret-absence scans, and explicit pending-gate records.

**Out of scope:** creating or modifying cloud accounts/projects/services, runtime secrets, DNS/domains, monitoring/alerting, Auth flows (#12/#13), BFF implementation, and image upload behavior (#19/#20). The live Supabase PostgreSQL gate remains pending until credentials and a disposable/target environment exist.

### Approaches

1. **Platform-native integrations for deployment and previews** — Vercel and Railway watch GitHub, while GitHub Actions only runs quality and a separate migration gate.
   - Pros: low repository code, natural PR previews, less CLI maintenance.
   - Cons: native production auto-deploy can race the required migration gate; preview secrets and database isolation are easy to misconfigure; behavior cannot be proven without accounts.
   - Effort: Low for setup, Medium for safe release controls.

2. **GitHub-controlled production release with platform deployment hooks/API** — quality completes first; a serialized production release runs `prisma migrate deploy` once with `DIRECT_URL`, then promotes the API, then deploys/promotes the web and runs smoke checks. PR previews use provider-native preview integrations or an explicitly gated preview job with separate resources.
   - Pros: directly honors ADR-0008, makes migration ordering auditable, supports concurrency control and rollback points, and keeps production secrets in GitHub environment/platform secret managers.
   - Cons: requires provider credentials/deploy hooks and careful failure handling; provider-specific deployment API details must be confirmed during provisioning.
   - Effort: Medium.

3. **Railway pre-deploy migration command or manual migration runbook** — migrations run as part of Railway startup/deploy or are performed manually before each release.
   - Pros: simple platform setup; no separate deployment API workflow.
   - Cons: startup commands can run concurrently on replicas and violate the locked decision; manual release steps are less auditable and easier to skip.
   - Effort: Low implementation, High operational risk.

For Supabase representation, `config.toml` is useful only if the project adopts and pins the Supabase CLI; a versioned idempotent SQL/bootstrap script plus runbook better describes the private bucket and Storage policies but couples to provider-managed schemas; runbook-only avoids schema coupling but is not reproducible enough. The recommended compromise is optional pinned local CLI config plus versioned bootstrap instructions/SQL where supported, with a manual provisioning gate and no Prisma ownership of Supabase-managed Storage metadata.

### Open Decisions

- **Release workflow granularity:** use one explicit production release workflow for ordered API migration/API deploy/web deploy, plus a separate PR preview workflow; keep quality as the required reusable/precondition gate. Do not let a native production integration bypass migration ordering.
- **Preview model:** prefer Vercel PR previews and Railway isolated preview services/environments only when each has a non-production Supabase project/database and private bucket. If preview secrets are absent, the workflow should skip with an auditable reason rather than fall back to production.
- **Migration and seed semantics:** use a serialized, protected production environment job for `prisma migrate deploy` with `DIRECT_URL`; run the idempotent catalog seed during initial environment bootstrap or an explicitly approved release step, not on every API replica startup. The runbook must include apply, re-apply, status, and seed evidence to close the pending gate.
- **Provider configuration form:** decide whether the Railway/Vercel projects are configured through repository files, project settings, or both. The proposal should pin supported file formats and record any settings that cannot be represented as code.
- **Environment variable names:** retain the existing API names exactly; define and document server-only Auth/JWKS/Storage credentials, bucket name, and the web BFF API origin before implementation. Public `NEXT_PUBLIC_*` values must not become a substitute for privileged API or Storage credentials.
- **Branch protection ownership:** record GitHub-admin actions in the runbook: protect `main`, require pull requests and the `quality` status, disallow force-push/deletion, and require the agreed review policy. This cannot be enforced by a repository file alone.

### Recommendation

Proceed with the GitHub-controlled production release approach, separate preview workflow, and explicit environment matrix. Keep quality and contract checks as a hard prerequisite; serialize the production release with a concurrency group; run migrations once with `DIRECT_URL` before API promotion; deploy the web only after the API release succeeds; and smoke-test `/health/live`, `/health/ready`, and the web deployment without logging response secrets. Use provider-native previews only with isolated Supabase resources and a secrets-presence preflight. Represent provider settings in conventional config files where their schemas are confirmed, and use a versioned Supabase bootstrap/runbook for the private bucket and policies. This gives the proposal a locally testable boundary while honestly retaining cloud provisioning and live PostgreSQL validation as pending gates.

### Risks

- Cloud workflows and health checks cannot be live-tested until Supabase, Railway, and Vercel accounts and secrets exist; static validation is the only current evidence.
- A platform-native auto-deploy or a Railway startup migration could promote API code before the controlled migration step or execute migrations concurrently.
- Preview misconfiguration could point at production PostgreSQL or the production private bucket, violating the environment separation decision.
- GitHub branch protection is repository administration, not config-as-code, and may remain absent even when the runbook is complete.
- Secrets can leak through workflow commands, generated frontend bundles, URLs, logs, or copied runbook examples; names-only templates and secret-absence scans are mandatory.
- Provider configuration formats and Storage policy behavior can drift from the runbook; provisioning must record actual settings and revisit the static assertions.
- The live migration/seed/trigger/concurrency gate remains unsatisfied and cannot be claimed closed by YAML or JSON validation.
- `openspec/config.yaml` still describes the repository as planning-only with zero application projects, which conflicts with the empirically present apps and should not override the real current state during proposal/design.

### Ready for Proposal

**Yes.** The scope, locked constraints, recommended release ordering, provider-account boundary, environment matrix needs, and pending gates are sufficiently clear for `sdd-propose`. The proposal should preserve the explicit cloud-provisioning blocker and require a later live evidence record before claiming deployment readiness.
