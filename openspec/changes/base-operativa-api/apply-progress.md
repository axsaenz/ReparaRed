# Apply Progress: API Operational Foundation

## Delivery Resolution

- Resolution: `size:exception`.
- Rationale: The forecast marked the change high risk at 460–540 authored lines and recommended chained PRs, but no Git remote exists to host chained PRs (deployment infrastructure remains backlog item #11). The slices are not independently working because the problem filter depends on correlation, health failures route through the filter, and logging is cross-cutting. The backlog convention is one commit per item, and the overrun is driven by mandatory tests from item #2. The complete change is therefore implemented as one cohesive unit without compressing code or dropping tests/comments.

## Execution Mode

- Change: `base-operativa-api`
- Artifact store: `openspec`
- Testing mode: Standard (`strict_tdd: false`); Vitest is available.
- Runtime harness: Nest `app.init()` plus Fastify `inject()`; no listener or external services.

## Work Unit Evidence

| Phase | Focused command and result | Runtime harness and result | Rollback boundary |
|---|---|---|---|
| 1. Dependencies/config | `npm run typecheck --workspace=@repara/api` — passed. | `$env:PORT='not-a-port'; node apps/api/dist/main.js` — exited 1 before listening and emitted only the fixed safe startup message; defaults/unknown and explicit `PORT=3001` boot checks passed. | `apps/api/package.json`, `package-lock.json`, `apps/api/src/config/`, `apps/api/.env.example`, and boot handling in `main.ts`/`app.factory.ts`. |
| 2. Correlation/errors/logging | `npm --workspace=@repara/api test -- trace-id pino-options` — 2 files and 12 tests passed; mapping/normalization coverage also passed in the 19-test secrets gate. | Fastify injection verifies response trace echo, problem content type, deterministic 404, malformed fallback IDs, and query-free routes. | `apps/api/src/common/` plus logger/config wiring in `app.module.ts`, `app.factory.ts`, and `main.ts`. |
| 3. Health | Health controller unit suite — 4 tests passed for live, foundation-ready, down result, and Terminus rejection paths. | Fastify injection verifies `/health/live` and `/health/ready` return minimal 200 JSON offline; no dependency calls are registered. | `apps/api/src/health/`. |
| 4. Tests | `npm test` — workspace passed: web 1 test, API 42 tests. | `app.integration.spec.ts` uses `app.init()` and Fastify `inject()` only; listening state remains false. | Test files under `apps/api/src/` and the retained controller smoke test. |

## RED-Gate Evidence

| Gate | Named check | Result |
|---|---|---|
| 5.1 | `npm --workspace=@repara/api test -- trace-id pino-options` — 2 files, 12 tests passed; captured writer confirms malformed trace input is not emitted raw. | Pino option generator and serializer path exercised with newline trace input, credentials, and query URL. | Revert `trace-id.ts`, `fastify-hooks.ts`, and `pino-options.ts` plus their unit tests. |
| 5.2 | `npm --workspace=@repara/api test -- env.schema problem-details.filter pino-options` — 3 files, 19 tests passed; fixed problem details, redaction, body/query omission, and non-secret example verified. | Captured Pino destination parsed one JSON line with required fields; filter unit path verifies no exception message/stack leakage. | Revert config, errors, logging, and `.env.example` files plus their tests. |
| 5.3 | `npm --workspace=@repara/api test -- app.integration` — 1 file, 8 tests passed; public exclusions, unknown 404, trace equality, and fallback verified. | `app.init()` plus Fastify `inject()` only; `server.server.listening` remained false. | Revert `app.factory.ts`, `app.module.ts`, `main.ts`, health wiring, and integration test. |

## Quality and Release

- Final quality commands: `npm run lint` (exit 0; existing Next pages warning), `npm run format:check` (exit 0), `npm run typecheck` (exit 0), `npm test` (exit 0; web 1 test and API 42 tests), and `npm run build` (exit 0; web and API builds passed).
- Commit: one final commit with exact message `chore: add API operational foundation`; no `commit -a` and no push.
- Revision/status: `main`; staged delivery contains only source, tests, manifests/lockfile, and change artifacts; generated `dist/`, `.next/`, coverage, and build metadata are excluded.
- Final authored line count: approximately 1,605 changed lines in the staged `git show --stat`/`--numstat` view excluding `package-lock.json` and generated output (1,593 additions and 12 deletions, including committed change artifacts); implementation source/tests account for approximately 1,044 of those lines. The `size:exception` resolution remains explicit because the full tested unit exceeds the default review budget.

## Task Progress

- Completed: 1.1–1.3, 2.1–2.4, 3.1, 4.1–4.3, and 5.1–5.5 (16 of 16 tasks).
- Remaining: none; ready for independent `sdd-verify`.
