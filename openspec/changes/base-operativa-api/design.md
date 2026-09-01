# Design: API Operational Foundation

## Technical Approach

Extend the existing NestJS/Fastify CommonJS skeleton with global configuration, Fastify correlation, a native problem filter, `nestjs-pino`, and Terminus probes. This satisfies all eight `api-foundation` requirements without persistence, identity, OpenAPI, or external calls, and remains aligned with ADRs 0001–0020.

## Architecture Decisions

| Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|
| Configuration | `ConfigModule.forRoot({ isGlobal: true, validationSchema, validationOptions: { allowUnknown: true, abortEarly: false, stripUnknown: false } })`; Joi validates `NODE_ENV` (`development|test|production`, default `development`), `PORT` (integer 1–65535, default 3000), `HOST` (default `0.0.0.0`), and `LOG_LEVEL` (`fatal|error|warn|info|debug|trace`, default `info`). `AppConfigService` provides typed getters. Bootstrap catches Joi init failure, prints key names plus fixed safe text, sets non-zero exit, and never prints values. | Zod/class-validator | Native validation fails pre-listen, permits unrelated keys, and avoids stringly typed consumers. |
| Correlation | Shared `resolveTraceId` accepts `x-trace-id` only as a string matching `^[A-Za-z0-9._-]{1,128}$`; otherwise it returns `crypto.randomUUID()`. Pass it to Fastify `genReqId`, copy `request.id` to decorated `traceId`, and echo it via `onSend` on every response. | AsyncLocalStorage | Request state reaches filter and Pino directly without request-scoped context. |
| Errors | Global `@Catch()` gets `FastifyReply`; maps 400/401/403/404/409/422/429/503 to `INPUT_INVALID`/`AUTHENTICATION_REQUIRED`/`FORBIDDEN`/`NOT_FOUND`/`CONFLICT`/`SEMANTIC_INVALID`/`RATE_LIMITED`/`DEPENDENCY_UNAVAILABLE`; all else is 500 `INTERNAL_ERROR`. A hook normalizes future `{ field, messages }` data to sorted `Record<string,string[]>`. | Controller responses; Express APIs | One boundary guarantees frozen mapping, deterministic type, and safe details. |
| Logging | `LoggerModule.forRootAsync` creates Pino with config level, `service: reparared-api`, normalized `env`, and the same `pino-http` `genReqId`; `customProps` supplies `traceId`. Completion fields are timestamp, level, route without query, status, duration. Serializers omit body/query; redaction covers authorization, cookies, password-like keys, secrets, signed URLs. `app.useLogger(app.get(Logger))` bridges Nest. | Built-in Logger adapter | Pino provides single-line JSON, redaction, duration, and Fastify integration. |
| Health | Terminus `HealthController` exposes `/health/live` via `check([])` and `{status:"ok"}`; ready checks only `app-foundation`, reserving an ordered #4 DB slot. It omits `@HealthCheck`, catches `HealthCheckError`, and rethrows `ServiceUnavailableException`, leaving all 503s to the global filter. | Hand-written probes; native Terminus envelope | Keeps the extension point while guaranteeing problem JSON on failure and minimal JSON on success. |
| Runtime | Keep `module: commonjs` and `moduleResolution: node10`; consume ESM-first packages via Node 24 `require(esm)` and verify boot/inject. | ESM conversion | Preserves the actual skeleton. |

## Data Flow

```text
request -> genReqId -> decorated traceId -> handler -> Pino log
        -> onSend header echo; filter uses the same id in problems
```

Problem payload: `{ type: "urn:reparared:error:{CODE}", title, status, detail, code, traceId, fieldErrors? }`; the filter sends it with `reply.status(status).type('application/problem+json').send(problem)`. Details are code-derived fixed text; unknown errors never expose `exception.message` or `stack`.

Bootstrap order is config module init (before listen) → logger → prefix `api/v1` excluding `GET /`, `GET /health/live`, `GET /health/ready` → global filter → listen on typed `HOST`/`PORT`. `AppModule` imports config, logger, Terminus in that order and retains `AppController`.

## File Changes

| Path | Action | Purpose |
|---|---|---|
| `apps/api/src/config/env.schema.ts`, `app-config.service.ts`, `config.module.ts` | Create | Joi schema and typed accessor. |
| `apps/api/src/common/request/trace-id.ts`, `fastify-hooks.ts` | Create | ID validation, generation, storage, and echo. |
| `apps/api/src/common/errors/problem-details.ts`, `problem-details.filter.ts`; `common/logging/pino-options.ts` | Create | Contracts/filter and Pino options. |
| `apps/api/src/health/health.module.ts`, `health.controller.ts`, `foundation.indicator.ts` | Create | Liveness/readiness. |
| `apps/api/src/app.factory.ts`, `app.module.ts`, `main.ts` | Create/modify | Reusable setup and bootstrap. |
| `apps/api/src/config/env.schema.spec.ts`, `common/request/trace-id.spec.ts`, `common/errors/problem-details.filter.spec.ts`, `common/logging/pino-options.spec.ts`, `health/health.controller.spec.ts`, `app.integration.spec.ts`, `app.controller.spec.ts` | Create/modify | Unit/injection tests; retain root smoke test. |
| `apps/api/package.json`, `package-lock.json` | Modify | Runtime manifest and lock refresh. |
| `apps/api/.env.example` | Optional create | Non-secret foundation names only. |

## Dependency Manifest

| `apps/api/package.json` runtime addition | Version |
|---|---|
| `@nestjs/config`, `joi`, `pino`, `nestjs-pino`, `pino-http`, `@nestjs/terminus` | `^12.0.0`, `^18.2.5`, `^10.3.1`, `^5.0.0`, `^11.0.0`, `^12.0.0` respectively |

`pino-http` latest was verified read-only as `11.0.0` on 2026-09-01. Add no dev dependencies; refresh the root lockfile.

## Testing Strategy

Unit tests cover env defaults/abort/unknown-key safety, all status mappings, field normalization, and trace-ID cases. Fastify `inject()` uses `app.init()` only for root, both probes, unknown 404, content type, trace equality, fallback IDs, and offline startup. A custom writable Pino destination asserts single-line fields, query/body omission, and authorization/password redaction. Threat cases below become unchanged RED tests.

## Threat Matrix

No shell commands, subprocesses, git automation, push, or PR composition are added.

| Boundary | Applicability and response | Planned RED test |
|---|---|---|
| Routing/process integration | Applicable: prefix exclusions and unknown routes fail safely as correlated problem 404s. | Inject each public path and unknown path. |
| Documentation-like paths | N/A: no executable-file classification. | None. |
| Git repository selection | N/A: no git automation. | None. |
| Commit state | N/A: single-commit state is owned by apply phase, not this design. | None. |
| Push state | N/A: no push automation. | None. |
| PR commands | N/A: no PR composition. | None. |
| Log injection | Applicable: reject trace text outside the regex and generate an opaque ID. | Inject newline/control/oversized trace values; assert generated ID and logs. |
| Secrets boundary | Applicable: no secrets in config examples; redaction and fixed details prevent exposure. | Send authorization/cookie/password-like input and assert absence in captured logs/problems. |

## Migration / Rollout

One commit; no data migration or flag. Rollback is a revert, restoring the bare skeleton.

## Open Questions

None.
