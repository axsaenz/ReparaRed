# Proposal: Implement BACKLOG.md item #3: API operational foundation

## Intent

Give `apps/api` safe defaults for every later feature: fail-fast configuration, uniform problem-details errors, correlated structured logs, and database-free health probes, per TECH-DESIGN §7.1/§11 and ADR-0005/0010.

## Scope

### In Scope
- Validate consumed `NODE_ENV`, `PORT` (default `3000`, bounded), `HOST`, and `LOG_LEVEL`; allow unrelated platform keys and never print values.
- Add a Fastify-native global problem filter, correlation, redacted JSON logging, and app-only health.
- Apply `/api/v1` to business routes; exclude `/health/live`, `/health/ready`, and unversioned `GET /` smoke `{status:'ok'}`.
- Add Vitest units (env/filter/correlation), Fastify `inject()` integration (no listener/services), and lockfile refresh.

### Out of Scope

DB/Prisma readiness (#4), OTel, OpenAPI (#10), auth, BFF/frontend, deployment config, business modules, queues, retries, metrics, and alerting.

## Capabilities

### New Capabilities
- `api-foundation`: validated runtime configuration, safe problem responses, request correlation, structured logs, and health probes.

### Modified Capabilities
- None.

## Approach

- Use runtime ranges `@nestjs/config ^12`, `joi ^18`, `pino ^10`, `nestjs-pino ^5` + `pino-http ^11`, and `@nestjs/terminus ^12`.
- Joi validates consumed foundation settings only, defaults `PORT` to `3000` with a range, fails before listen, allows unknown keys, and never logs values.
- A global Fastify `ExceptionFilter` maps 400/401/403/404/409/422/429/503 and unexpected 500; emits `type/title/status/detail/code/traceId` plus optional stable `fieldErrors`, with uppercase codes, deterministic code-derived type URIs, and detail sanitized against stack/SQL/tokens.
- Generate bounded crypto-random opaque IDs; validate `x-trace-id`, reject malformed/oversized/log-injection input, and echo the ID in response header, problem body, and log context.
- `nestjs-pino` emits single-line JSON with timestamp, level, service, env, normalized route, status, duration, and traceId; redact authorization/cookies/password-like fields, omit bodies, and route Nest logs through Pino.
- Terminus exposes process-only `/health/live` and foundation-only `/health/ready` (explicit #4 DB extension): minimal success JSON, problem+json `503` on failure.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/api/src/main.ts`, `apps/api/src/app.module.ts` | Modified | Operational bootstrap and module wiring. |
| `apps/api/src/config/`, `apps/api/src/common/errors/`, `apps/api/src/common/request/`, `apps/api/src/health/` | New | Config, errors, correlation, probes. |
| `apps/api/src/**/*.spec.ts` | New | Unit and injection tests. |
| `apps/api/package.json`, root `package-lock.json` | Modified | Runtime deps and lock refresh. |
| `apps/api/.env.example` | Optional | Non-secret variables only. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| ESM-first packages in CJS skeleton | Med | Boot/inject gate; avoid broad conversion. |
| Fastify/Express filter mismatch | Med | `FastifyReply` and integration tests. |
| Pino redaction or peer mismatch leaks/breaks | Med | Explicit redaction, no bodies, verified majors; Node 24 satisfies peers. |
| Scope drifts toward OTel/DB | Med | Explicit exclusions and app-only readiness. |
| Invalid `PORT` gets masked | Low | Reject explicit invalid values pre-listen; default only when absent. |

## Rollback Plan

Ship as one commit; revert it to remove operational modules/dependencies and restore the prior bare skeleton. No data or flags are involved.

## Dependencies

Items #1/#2 are archived prerequisites. No external services or network access at boot.

## Success Criteria

- [ ] Invalid/missing required env fails clearly pre-listen; valid env serves.
- [ ] Unknown 404 is problem+json with matching trace header/body; field errors are stable and details sanitized.
- [ ] Single-line JSON logs contain required fields and redact authorization.
- [ ] Live/ready return minimal success JSON or problem+json 503; only business routes use `/api/v1`.
- [ ] `npm test` needs no listener; `npm ci` is clean with refreshed lockfile; lint/typecheck/build pass; no secrets exist.
