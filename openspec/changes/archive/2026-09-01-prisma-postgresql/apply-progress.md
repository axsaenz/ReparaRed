# Apply Progress: Prisma + PostgreSQL

## Remediation Revision — 2026-09-01

- `SCOPE-URL-LITERAL-001`: removed URL-shaped literals from the committed evidence and replaced them with names-only descriptions, including a dummy `DIRECT_URL` with postgresql scheme supplied at invocation only.
- `WORKTREE-CLEAN-001`: included the modified OpenSpec state metadata in the amended change commit and re-checked the repository for a clean worktree.

## Status

- Change: `prisma-postgresql`
- Artifact store: `openspec`
- Mode: Standard (`strict_tdd: false`; Vitest runners are available)
- Apply state at start: `ready`
- Scope: all assigned tasks, phases 1–6
- Completion: 21/21 tasks complete

## Delivery Resolution

The workload forecast was Medium at 360–395 authored lines, with `Decision needed before apply: Yes` and `Chained PRs recommended: No`. The orchestrator-resolved delivery path was **SINGLE COMMIT, PROCEED**: no chaining and no `size:exception`. The single work unit covers the Prisma foundation, configuration seam, health integration, tests, quality evidence, and pending-live-gate record.

## Implementation Summary

### Phase 1 — Prisma foundation

- Added exact `6.19.3` pins for `@prisma/client` and `prisma`.
- Added npm-only generation, migration deploy/status, and `prebuild` scripts.
- Added names-only `DATABASE_URL` and `DIRECT_URL` entries to `.env.example`.
- Added the PostgreSQL `DIRECT_URL` schema with the default `prisma-client-js` output and zero models.
- Added the comment-only empty baseline and PostgreSQL migration lock.
- Confirmed the existing `node_modules/` ignore rule covers generated Prisma output; no extra ignore rule was needed.

### Phase 2 — Configuration and client seam

- Added optional PostgreSQL-only `DATABASE_URL` validation with key-only Joi errors.
- Added the `databaseUrl` getter without logging the value.
- Added one Nest-scoped `PrismaService`; configured construction supplies `datasourceUrl`, while connection remains lazy.
- Added guarded shutdown and normal (non-global) `DatabaseModule`; imported it from `AppModule`.

### Phase 3 — Health

- Added the conditional database health indicator with a bounded 2000 ms `SELECT 1` race.
- Added safe `ServiceUnavailableException` conversion without importing `HealthCheckError` or exposing connection details.
- Wired the indicator at readiness extension point #4; liveness remains dependency-free.

### Phase 4 — Tests

- Added the valid, invalid, absent, and redaction URL matrix.
- Added lazy-construction, no-connect, guarded-shutdown, and stubbed indicator tests.
- Added no-URL readiness 200, configured-unreachable readiness 503, liveness, and script-literal integration coverage.

## Work Unit Evidence

| Work unit | Focused test command and exact result | Runtime harness command/scenario and exact result | Rollback boundary |
|---|---|---|---|
| Phase 1 | `npm ls --workspace=@repara/api @prisma/client prisma --depth=0` — both resolve exactly `6.19.3`. | `npm install` at workspace root — completed successfully; Prisma schema/generation harness is recorded in Phase 5. | Revert `apps/api/package.json`, `apps/api/.env.example`, `package-lock.json`, and `apps/api/prisma/`. |
| Phase 2 | `npm exec --workspace=@repara/api -- vitest run src/config/env.schema.spec.ts src/database/prisma.service.spec.ts` — 2 files, 13 tests passed. | `npm test` integration boot without `DATABASE_URL` — `/health/live` and `/health/ready` remained 200 without dependency I/O. | Revert `apps/api/src/config/`, `apps/api/src/database/prisma.service.ts`, `apps/api/src/database/database.module.ts`, and `apps/api/src/app.module.ts`. |
| Phase 3 | `npm exec --workspace=@repara/api -- vitest run src/database/prisma-health.indicator.spec.ts src/health/health.controller.spec.ts` — 2 files, 7 tests passed. | `server.inject({ method: 'GET', url: '/health/ready' })` with a stubbed rejecting `$queryRaw` — 503 problem response; liveness stayed 200. | Revert `apps/api/src/database/prisma-health.indicator.ts`, `apps/api/src/health/`, and the related module wiring. |
| Phase 4 | `npm test` — web: 1 file/1 test passed; API: 9 files/54 tests passed; overall exit 0. | Fastify `inject()` exercised root, live, ready, unknown-route, malformed-trace, no-URL, and unreachable-DB scenarios without a listening socket. | Revert the five changed/added API test files. |
| Phase 5 | `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, and `npm run build` — all exit 0. | Temporary-env Prisma validate/diff/generate harness and the pre-staging RED gates all passed as recorded below. | Revert the single implementation commit; no generated client output is in the repository. |
| Phase 6 | Re-read `tasks.md` after persistence — every task is `[x]`, 21/21. | N/A — documentation-only pending-gate receipt; no live database is available. | Revert `openspec/changes/prisma-postgresql/apply-progress.md` only. |

## RED Gate Evidence

### Secrets RED gate — 5.1

Command: `npm exec --workspace=@repara/api -- vitest run src/config/env.schema.spec.ts src/database/prisma.service.spec.ts src/database/prisma-health.indicator.spec.ts src/app.integration.spec.ts`

Result: exit 0; 4 files and 25 tests passed. Invalid URL errors name `DATABASE_URL` without the invalid value, shutdown logging is key-free, problem responses contain neither the configured secret nor host, and `.env.example` contains empty URL assignments only.

### Shell RED gate — 5.2

The read-only package-script scan passed with no URL-shaped literal, password, secret, token, or credential literal. Running `npm exec --workspace=@repara/api -- prisma validate` without `DIRECT_URL` remained nonzero with Prisma `P1012` and only the missing key name in the error.

### Commit-state RED gate — 5.5

Before staging, `git diff --cached --quiet` and `git diff --cached --name-only` confirmed an empty index. The gate passed by refusing to treat an empty index as a valid commit manifest; task 5.6 performs explicit allowlisted staging only.

## Offline CLI Evidence

All temporary connection values were supplied only in the invocation environment and removed immediately afterward; no URL value was written to a file.

1. `npm exec --workspace=@repara/api -- prisma validate` with temporary `DIRECT_URL` — exit 0; schema valid under Prisma `6.19.3`.
2. `npm exec --workspace=@repara/api -- prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma` with temporary `DIRECT_URL` — exit 0; `No difference detected.` and no SQL statements. npm 12 executes workspace commands from `apps/api`, so the workspace-relative schema path was required; the literal root-relative path was path-invalid, not a schema failure.
3. `npm run prisma:generate --workspace=@repara/api` with temporary `DIRECT_URL` — exit 0; generated Prisma Client `6.19.3` under ignored `node_modules` output.
4. `git check-ignore -v node_modules/@prisma/client node_modules/.prisma/client` — all generated paths matched the existing `node_modules/` rule; no generated output appeared in `git status`.

## Quality Evidence

| Gate | Result |
|---|---|
| `npm run lint` | Exit 0; existing Next pages-directory informational warning only. |
| `npm run format:check` | Exit 0; all files matched Prettier style. |
| `npm run typecheck` | Exit 0 for web and API. |
| `npm test` | Exit 0; web 1/1 and API 54/54 tests passed. |
| `npm run build` | Exit 0; Next build and API TypeScript build passed, including Prisma `prebuild` generation. |

## Commit Boundary

The exact intended commit is `chore: add Prisma PostgreSQL foundation`. Only the allowlisted source, tests, Prisma directory, manifests, lockfile, `.env.example`, and OpenSpec change artifacts are eligible for staging. No `commit -a` and no push are permitted. The final clean-tree receipt is recorded in the executor result after the commit.

## Deviations and Issues

- The implementation follows the design. No domain models, migrations with SQL, seed scripts, eager connections, or runtime URL logging were added.
- npm 12 resolves workspace command paths from `apps/api`; the offline `migrate diff` proof therefore used `prisma/schema.prisma` after the requested root-relative spelling produced a path-not-found error. The corrected command passed with no SQL difference.
- npm reported three pre-existing high-severity audit findings during install; dependency remediation is outside this change scope.

## Pending Live Gate (UNSATISFIED)

`apply → re-apply → status` on disposable PostgreSQL = **UNSATISFIED**. Verification so far is **OFFLINE ONLY**; no live PostgreSQL migration verification is claimed here.

Closing conditions: local disposable PostgreSQL (user-installed or Docker) becomes available, or item #11 infrastructure becomes available. Until then, the live migration gate remains pending and this change is not acceptance-complete for live database behavior.

## Final Accounting

- Completed tasks: 21/21.
- Final authored implementation line count: 362 additions/deletions across the implementation manifest, excluding generated `package-lock.json` churn and 595 lines of OpenSpec planning/receipt artifacts; this is within the resolved 400-line implementation budget.
- Remaining implementation tasks: none.
- Remaining acceptance item: pending live gate only.
