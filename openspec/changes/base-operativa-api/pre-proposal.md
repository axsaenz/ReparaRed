# Pre-Proposal State — gentle-ai.sdd-preproposal/v1

- revision: 1
- status: confirmed
- exploration: `openspec/changes/base-operativa-api/exploration.md`
- research: unselected
- proposal_ready: true
- confirmed_by: orchestrator (auto mode mandate 2026-09-01 — recommended options auto-selected)

## Confirmed product decisions

| # | Decision | Confirmed value |
|---|----------|-----------------|
| 1 | env_validation | `nestjs-config-joi` — @nestjs/config + Joi validationSchema; fail-fast before listen; foundation vars ONLY: NODE_ENV, PORT (default 3000, validated range), HOST, LOG_LEVEL; no future DB/auth/storage vars |
| 2 | unknown_env_keys | `allow-unrelated-validate-consumed` — platform keys pass through; every consumed key validated; env values never logged/printed |
| 3 | problem_conventions | `uppercase-codes-deterministic-type` — stable uppercase machine codes, `type` URI derived deterministically from code, `fieldErrors` member shape frozen in spec |
| 4 | correlation | `generated-id-plus-x-trace-id` — crypto-random bounded opaque ID when absent; optional inbound `x-trace-id` validated (reject oversized/malformed, no log injection); same ID in problem body + response header + log context |
| 5 | health_failure_body | `problem-json-503` — application/problem+json on non-2xx; minimal health JSON on success |
| 6 | root_prefix | `keep-root-smoke-exclude-health-from-prefix` — global prefix `/api/v1` for business routes; `/health/live` + `/health/ready` unversioned; `GET /` kept as unversioned smoke route returning `{status:'ok'}` |
| 7 | test_boundary | `unit-plus-fastify-inject` — unit tests for env parser/filter mapping; Fastify `inject()` integration tests (content-type, headers, status, health); NO listening server, NO external services |

## Locked conventions from TECH-DESIGN/ADRs (binding, not negotiable)

- NestJS + Fastify adapter (ADR-0005); base path `/api/v1` (TD §7.1)
- Error envelope `application/problem+json`: `type`, `title`, `status`, `detail`, `code`, `traceId`, optional field errors (TD §7.1)
- Error categories → 401/403/404/409/422/429/503, 500 for unexpected (ADR-0010)
- JSON logs: timestamp, level, service, env, traceId, route, status, duration, no sensitive data (TD §11)
- `GET /health/live` (process) + `GET /health/ready` (indispensable deps, timeout) (TD §11)
- User-facing messages never expose traces/SQL/tokens/internal details (ADR-0010)
- No queues/outbox/circuit breakers in MVP (ADR-0010); secrets live in platform secret manager, not repo (ADR-0008)

## Capability impact (binding)

NEW capability `api-foundation`. Do NOT modify `monorepo-workspace` (18 requirements remain true).

## Scope boundary (binding)

IN: validated env config, global problem-details filter (Fastify-native), correlation IDs, pino structured logs with redaction, terminus liveness + app-only readiness, `/api/v1` prefix wiring, Vitest unit + inject() tests, lockfile refresh. OUT: Prisma/DB health indicators (#4), Supabase/auth (#5,#12,#13), OpenAPI publication (#10), BFF/frontend (#13+), deploy config (#11), OpenTelemetry, business modules.

## Verified dependency candidates (registry 2026-09-01; all RUNTIME deps of apps/api)

@nestjs/config ^12.0.0, joi ^18.2.5, pino ^10.3.1, nestjs-pino ^5.0.0 (peers: pino-http ^11), @nestjs/terminus ^12.0.0. CJS-skeleton consumption of ESM-first packages already proven in item #1 (Node 24 require(esm)); still gate with a real boot + inject test.
