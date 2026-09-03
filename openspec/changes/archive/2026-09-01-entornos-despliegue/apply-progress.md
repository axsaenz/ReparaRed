# Apply Progress: Deployment Environments

## Delivery resolution

- Change: `entornos-despliegue`
- Artifact store: `openspec` file-based persistence.
- Apply mode: Standard Mode (`strict_tdd: false`).
- Delivery resolution: `size:exception` APPROVED.
- Workload: one cohesive local-only unit; no remote PR chain.
- Review forecast: High risk, estimated at 700–800+ authored lines because the
  runbook, matrix, static validation, and audit records are intentionally
  explicit and are not compressed to fit a review budget.
- Rollback boundary: revert the single deployment-configuration commit. No
  remote resource is changed by this apply phase.

## Completed task record

All fifteen assigned tasks are complete:

| Phase | Tasks | Result |
|---|---|---|
| 1. Provider configs | 1.1, 1.2 | Provider JSON and private rerunnable bootstrap committed; static checks pass. |
| 2. Workflows | 2.1, 2.2, 2.3, 2.4 | Reusable quality, serialized production, and isolated preview workflows committed. |
| 3. Env and docs | 3.1, 3.2, 3.3 | Names-only templates, matrix, provisioning runbook, and evidence procedure committed. |
| 4. Static validation | 4.1, 4.2 | `yaml` dependency, script, and eight-test deployment validation suite committed. |
| 5. Gates and commit | 5.1, 5.2, 5.3 | Quality gates, RED scan, explicit staging, exact commit, and clean-tree verification completed. |
| 6. Records | 6.1 | This cumulative progress record created with static evidence and pending gates. |

## Work Unit Evidence

All evidence below is labeled `STATIC`: it proves repository state and offline
validation only. There is no cloud runtime boundary available in this phase.

| Evidence | Required result |
|---|---|
| Focused test command and exact result (`STATIC`) | `npm run test:deployment` — exit 0; 1 Vitest file passed, 8 tests passed. The suite parses both JSON files and all three workflow YAML files, checks ordering/concurrency/skip isolation, checks SQL privacy/idempotency, scans credentials, and checks runbook headings. |
| Runtime harness command/scenario and exact result (`STATIC`) | `N/A` — no cloud runtime boundary exists. Production and preview execution are deliberately pending; `npm test` is the available local application harness and passed 23 files / 131 tests. |
| Rollback boundary (`STATIC`) | Revert `chore: add environments and deployment configuration`; this removes only the provider configs, workflows, templates, docs, tests, dependency entry, and change artifacts in this unit. Nothing remote has been deployed. |

### Evidence by phase

| Phase | Focused evidence (`STATIC`) | Result |
|---|---|---|
| 1 | `npm run test:deployment` JSON and SQL assertions | PASS — JSON parses, bucket is private, four policies are service-role-only, and guards are present. |
| 2 | `npm run test:deployment` workflow assertions | PASS — quality is reusable, release needs quality, migration precedes optional seed and promotions, concurrency is serialized, and preview skip/isolation is auditable. |
| 3 | `npm run test:deployment` template and runbook assertions | PASS — six consumed API names, dated future names, no current web variables, matrix, headings, secret names, and evidence procedure are present. |
| 4 | `npm run test:deployment` | PASS — 1 file and 8 tests. Root `yaml` devDependency is locked. |
| 5 | Full quality command and RED scan | PASS — lint, format check, typecheck, test, deployment test, build, contract check, and contract diff passed; no credential-like literals found. |
| 6 | This file plus checked task artifact | PASS — progress is persisted in OpenSpec and the task checklist is cumulative. |

## RED evidence

### Workflow/config/env/doc scan (`STATIC`)

The pre-change Phase 2.1 scan was run against the intended deployment-owned
paths without echoing matches. The result was:

`RED secret/literal scan: PASS (0 credential-like literals; named secret references and blank/placeholders only)`

### Final tracked-file scan (`STATIC`)

The Phase 5.2 scan covered provider JSON, Supabase SQL, all three workflows,
both environment templates, both deployment documents, the validation spec,
root package metadata, the lockfile, and the change artifacts. It allowed only
blank assignments, named GitHub secret expressions, and clearly marked
placeholders. The result was:

`RED secret/literal scan: PASS (0 credential-like literals; named secret references and blank/placeholders only)`

No finding was printed. The preview scan separately confirmed that
`preview.yml` contains no production resource prefix, production release group,
or production bucket name.

## Quality gate evidence (`STATIC`)

The consolidated command completed with `ALL QUALITY GATES: PASS`:

| Command | Exact result |
|---|---|
| `npm run lint` | Exit 0. ESLint completed; the existing Next pages-directory advisory was emitted without failure. |
| `npm run format:check` | Exit 0. All files matched Prettier style. |
| `npm run typecheck` | Exit 0 across web, API, and API client workspaces. |
| `npm test` | Exit 0; 23 test files and 131 tests passed. |
| `npm run test:deployment` | Exit 0; 1 test file and 8 tests passed. |
| `npm run build` | Exit 0; web, API, and API client builds passed. |
| `npm run contract:check` | Exit 0; export, generation, validation, and typecheck completed. |
| `npm run contract:diff` | Exit 0; no breaking changes detected. |

The runtime harness for the application test suite is local and does not
replace the pending provider gates. Prisma emitted its existing configuration
deprecation warning during build; it did not affect the exit result.

## Commit-state evidence (`STATIC`)

Only the intended provider configs, workflows, environment templates,
documentation, validation spec, root package metadata and lockfile, and
`openspec/changes/entornos-despliegue/` artifacts were staged. Generated build,
Prisma, and contract outputs were not included. The exact commit message is:

`chore: add environments and deployment configuration`

The commit was created without `commit -a` and was not pushed. The final tree
was checked clean after commit.

## Authored count and delivery note

Final authored count: **1,936 changed lines** (**1,934 additions + 2
deletions**) from the staged diff after the exact file allowlist was staged.
This cohesive unit intentionally exceeds the default 400-line review budget;
the explicit `size:exception` approval is the governing delivery resolution.
Documentation, tests, comments, blank lines, and audit evidence were not
compressed or removed to reduce the count.

## Pending gates — all unsatisfied

The following six gates remain verbatim pending because this phase has only
static repository evidence:

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
   Close only after the migration/seed evidence-closure procedure is executed
   with real target credentials, including counts and complete evidence.
5. **Branch protection application** — PENDING. Close after a GitHub
   administrator records active `main` protection, pull-request review,
   required `quality`, and force-push/deletion restrictions.
6. **Deploy/preview live execution** — PENDING. Close after a production run
   proves quality → migration → Railway → Vercel → smoke ordering and a pull
   request proves isolated preview behavior or an explicit audited skip.

Static validation, local tests, and this record do not close any of these
gates. The next recommended phase is independent `sdd-verify`.
