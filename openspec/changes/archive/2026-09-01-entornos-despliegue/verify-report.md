```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:1092a14b66c23eeb308f347648b45bd780fac7b8e5cf5e268344bbd7ffb9d924
verdict: pass
blockers: 0
critical_findings: 0
requirements: 10/10
scenarios: 20/20
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:c7779f9cb192adc60ee009fd8915785bc30c06eafbd9d5486cba10e41051f502
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:f61e5f79d38b6a698bddcd56e28678d12d30d53bf59b3c1c57a914424150c778
```

## Verification Report

**Change**: `entornos-despliegue`  
**Version**: Deployment Environments Specification  
**Mode**: Standard (`strict_tdd: false`)

### Completeness

| Metric | Value |
|---|---:|
| Requirements retrieved | 10 |
| Scenarios retrieved | 20 |
| Tasks total | 15 |
| Tasks complete | 15 |
| Tasks incomplete | 0 |

### Build and Tests Execution

| Command | Exit | Observed result |
|---|---:|---|
| `npm ci` | 0 | 588 packages installed; npm reported advisory/deprecation noise only. SHA-256 of `package-lock.json` before and after: `4A51033DC8FD79FC86B0868CC46810DDD3A59644A3F76462BAF2B6753D5300FD`. |
| `npm run lint` | 0 | ESLint completed. The existing pages-directory advisory was emitted without failing the command. |
| `npm run format:check` | 0 | All files matched Prettier style. |
| `npm run typecheck` | 0 | Web, API, and API-client type checks completed. |
| `npm test` | 0 | 23 test files and 131 tests passed. |
| `npm run test:deployment` | 0 | One Vitest file and 8 deployment-config tests passed. |
| `npm run build` | 0 | Web, API, and API-client builds completed. Existing Prisma configuration deprecation warning did not affect the exit result. |
| `npm run contract:check` | 0 | Contract export, generation, validation, and type checking completed. |
| `npm run contract:diff` | 0 | `OpenAPI compatibility: no breaking changes detected.` |

`npm test` runs the application workspaces and does not include the root deployment
spec; `npm run test:deployment` was therefore run independently and passed. The
Prisma client was absent after `npm ci`, so the permitted one-time
`npm run prisma:generate --workspace=@repara/api` command was run and exited 0.
No cloud runtime harness was available or attempted.

Coverage is not configured (`coverage_threshold: 0`); this change is verified by
offline/static contract tests and source inspection rather than remote coverage.

### Requirement Verification Table

| Requirement | Commands | Observed result | Status |
|---|---|---|---|
| R1 Environment separation and variable matrix | `npm run test:deployment`; inspect `docs/environments.md`; `git ls-files` environment scan; preview resource grep | Six matrix rows cover local, preview, and production for API and web. Consumed/future names are documented, API names are server-only, web future names distinguish server-only `API_ORIGIN` from public `NEXT_PUBLIC_APP_ENV`, and preview resource refs are absent from `preview.yml`. Tracked `.env` scan found only `apps/api/.env.example` and `apps/web/.env.example`. | PASS |
| R2 Serialized production release | `npm run test:deployment`; independent JSON/YAML parse and workflow-order script; secret-reference grep | JSON/YAML parsing passed. Parsed release has `needs: quality-reuse`, `production-release` concurrency, `cancel-in-progress: false`, and step order migration → optional seed → Railway → Vercel → smoke at indexes 5 → 6 → 7 → 8 → 9. Migration uses the named `DIRECT_URL` secret reference and fails when absent; smoke checks include live, ready, and web HTTP 200 checks. | PASS |
| R3 Migration and seed discipline | `npm run test:deployment`; grep workflows/configs for startup commands; inspect `docs/deployment.md` evidence procedure | Railway `startCommand` is exactly `node dist/main.js`; no migration or seed command is attached to API startup. Production seed defaults to `false` and is gated by `inputs.seed == true`. The runbook contains the exact deploy → status → re-apply → seed evidence sequence and records counts, timestamps, exit codes, status, and complete output. | PASS |
| R4 Isolated preview preflight | `npm run test:deployment`; preview workflow grep and parsed branch inspection | Missing credentials or a non-`isolated` resource class sets `proceed=false`, writes an explicit `PREVIEW SKIPPED` log and `$GITHUB_STEP_SUMMARY` marker, exits 0, and prevents the provider-validation job. `preview.yml` contains zero `PRODUCTION_`, `production-release`, or production bucket references. | PASS |
| R5 Privilege and connection boundary | `npm run test:deployment`; inspect `vercel.json`, both env templates, and environment matrix | `vercel.json` has no environment block or credentials. The web template contains only commented future `API_ORIGIN` and `NEXT_PUBLIC_APP_ENV`; no privileged public variable is present. The matrix and runbook document pooled `DATABASE_URL` for runtime and direct `DIRECT_URL` for Prisma operations, neither sent to Vercel. | PASS |
| R6 Private storage bootstrap | `npm run test:deployment`; SQL assertion script; directory inspection | `supabase/bootstrap.sql` creates/upserts `request-images` with `public = false`, has four `IF NOT EXISTS` policy guards and four `service_role` policies, and has no public/anonymous policy or credential. The bootstrap is under `supabase/`, separate from `apps/api/prisma/migrations/`. | PASS |
| R7 Configuration as code | `npm run test:deployment`; independent `JSON.parse`; inspect runbook | Both provider JSON files parse. Railway contains Nixpacks build, repository-root install/generation/build commands, `node dist/main.js`, `/health/ready`, timeout, restart policy, and Node 24 guidance. Vercel contains root install/build/output settings. Non-code settings are explicit runbook steps. | PASS |
| R8 Secret hygiene | `npm run test:deployment`; commit-wide scan of `git diff-tree --no-commit-id --name-only -r 12e6f45` | Deployment-owned secret scan passed. The independent scan of every file in commit `12e6f45` found 0 credential-like matches after removing only named secret expressions and clearly marked placeholders. Production workflow references six secret names and contains no literal credentials. | PASS |
| R9 Branch protection procedure | `grep`/source inspection of `docs/deployment.md`; pending-gate scan of `apply-progress.md` | The runbook checklist requires protecting `main`, pull requests, approval, the `quality` check, and forbids force-push and deletion; evidence capture is specified. Application remains explicitly pending. | PASS (pending gate recorded) |
| R10 Pending-gate honesty | `grep` workflows/docs for readiness/deployment claims; pending-gate scan; inspect `apply-progress.md` | Six pending gates are recorded verbatim in apply progress. No workflow or deployment document claims successful deployment or deployment readiness; static evidence is repeatedly limited to repository/offline evidence. | PASS (pending gates recorded) |

### Spec Compliance Matrix

All 20 scenarios have covering assertions in the passed deployment validation
file. The assertions are intentionally offline/static; they do not substitute
for the six live gates.

| Requirement | Scenario | Covering test | Result |
|---|---|---|---|
| R1 | Happy | `tests/deployment-config.spec.mjs` > documents the current and future environment names honestly | COMPLIANT |
| R1 | Edge | `tests/deployment-config.spec.mjs` > skips previews audibly and only proceeds for isolated resources | COMPLIANT |
| R2 | Happy | `tests/deployment-config.spec.mjs` > requires quality and serializes the production release | COMPLIANT |
| R2 | Edge | `tests/deployment-config.spec.mjs` > requires quality and serializes the production release | COMPLIANT |
| R3 | Happy | `tests/deployment-config.spec.mjs` > contains every required runbook chapter and pending gate | COMPLIANT |
| R3 | Edge | `tests/deployment-config.spec.mjs` > parses both committed provider JSON files | COMPLIANT |
| R4 | Happy | `tests/deployment-config.spec.mjs` > skips previews audibly and only proceeds for isolated resources | COMPLIANT |
| R4 | Edge | `tests/deployment-config.spec.mjs` > skips previews audibly and only proceeds for isolated resources | COMPLIANT |
| R5 | Happy | `tests/deployment-config.spec.mjs` > documents the current and future environment names honestly | COMPLIANT |
| R5 | Edge | `tests/deployment-config.spec.mjs` > rejects credential-like literals from deployment-owned files | COMPLIANT |
| R6 | Happy | `tests/deployment-config.spec.mjs` > keeps Supabase bootstrap private and rerunnable | COMPLIANT |
| R6 | Edge | `tests/deployment-config.spec.mjs` > keeps Supabase bootstrap private and rerunnable | COMPLIANT |
| R7 | Happy | `tests/deployment-config.spec.mjs` > parses both committed provider JSON files | COMPLIANT |
| R7 | Edge | `tests/deployment-config.spec.mjs` > contains every required runbook chapter and pending gate | COMPLIANT |
| R8 | Happy | `tests/deployment-config.spec.mjs` > rejects credential-like literals from deployment-owned files | COMPLIANT |
| R8 | Edge | `tests/deployment-config.spec.mjs` > rejects credential-like literals from deployment-owned files | COMPLIANT |
| R9 | Happy | `tests/deployment-config.spec.mjs` > contains every required runbook chapter and pending gate | COMPLIANT |
| R9 | Edge | `tests/deployment-config.spec.mjs` > contains every required runbook chapter and pending gate | COMPLIANT |
| R10 | Happy | `tests/deployment-config.spec.mjs` > contains every required runbook chapter and pending gate | COMPLIANT |
| R10 | Edge | `tests/deployment-config.spec.mjs` > contains every required runbook chapter and pending gate | COMPLIANT |

**Compliance summary**: 20/20 scenarios compliant at the required offline/static
boundary. No scenario is evidence of live provider execution.

### Design Coherence

| Design decision | Followed? | Observed evidence |
|---|---|---|
| Repository-root Vercel configuration | Yes | `vercel.json` uses `npm ci`, `npm run build:web`, and `apps/web/.next`. |
| Railway service root and API-only startup | Yes | `apps/api/railway.json` has the designed build boundary, `node dist/main.js`, and `/health/ready`. |
| Reusable quality precondition | Yes | `quality.yml` gained `workflow_call` and deployment static validation while all prior quality/contract/build steps remain unchanged. |
| Serialized production ordering | Yes | The parsed workflow uses the required quality dependency, concurrency lock, migration/seed/API/web/smoke ordering, and fail-fast checks. |
| Isolated preview skip path | Yes | Missing or non-isolated preview inputs produce an auditable successful skip and cannot fall back to production. |
| Private, rerunnable Supabase metadata | Yes | The SQL uses a private bucket upsert and guarded service-role-only policies outside Prisma migrations. |
| Names-only environment boundary | Yes | Templates and provider configuration contain no values; the matrix documents pooled runtime versus direct migration connections. |
| Non-code settings remain runbook-owned | Yes | Provider provisioning, branch protection, environment approval, and evidence procedures are documented. |

### Deviation Scrutiny

The normative `design.md` examples use `PRODUCTION_DIRECT_URL` as the GitHub
production migration secret name. The committed workflow and runbook instead use
`DIRECT_URL`, and `apply-progress.md` records this as the deliberate deviation.
The deviation is internally consistent with the existing API/Prisma contract,
the specification only requires a direct migration connection, and the workflow
still uses a names-only secret reference with fail-fast behavior. It does not
break an acceptance requirement, so it is a **WARNING**, not a blocker. Before
provisioning, the GitHub environment must use the implementation's actual
`DIRECT_URL` name, or the workflow, runbook, and design must be updated together.

The preview skip wording differs slightly from the design example
(`no isolated preview credentials` versus `no preview credentials`) but preserves
the required auditable skip, exit-0, isolation, and no-production semantics.

### Pending-Gate Audit

The following six gates remain **RECORDED PENDING** exactly as required by the
apply record and runbook:

1. **Supabase project** — PENDING.
2. **Railway service** — PENDING.
3. **Vercel app provisioning** — PENDING.
4. **Live PostgreSQL apply → re-apply → status plus seed evidence** — PENDING.
5. **Branch protection application** — PENDING.
6. **Deploy/preview live execution** — PENDING.

No cloud account, project, service, credential, branch rule, remote migration,
live deployment, or live workflow run was asserted or attempted. The runbook's
health and deployment language is procedural/evidence-template language, not a
claim that those checks have executed.

### Scope Discipline

Commit `12e6f45` contains the provider configs, workflows, environment
templates, deployment documents, static validation test, root `yaml` dependency,
and OpenSpec change records described by the design. It contains 1,934 additions
and 2 deletions across 21 files, under the explicitly approved `size:exception`.
No Prisma schema, domain migration, application feature, runtime secret, cloud
resource, or generated build output was added. The tree was clean before and
after independent verification commands.

### Issues Found

**CRITICAL**: None.  
**WARNING**: The implementation uses `DIRECT_URL` where the normative design
example names `PRODUCTION_DIRECT_URL`; see Deviation Scrutiny. Live gates remain
pending by design and are not failures of this offline verification.  
**SUGGESTION**: Align the design example with the frozen `DIRECT_URL` contract
before provisioning to eliminate operator ambiguity.

### Overall Verdict

**PASS WITH WARNINGS** — all 10 requirements and 20 scenarios pass the declared
offline/static verification boundary, all 15 tasks are complete, all quality
commands exit 0, and the only finding is a non-breaking secret-name deviation.
The six cloud/live gates must remain pending.

### Archive Notes

The change is ready for `sdd-archive` under the static-verification boundary.
Archive must preserve the six pending-gate records and this verification report;
archiving does not close provider provisioning, branch protection, migration
evidence, or live deploy/preview execution.
