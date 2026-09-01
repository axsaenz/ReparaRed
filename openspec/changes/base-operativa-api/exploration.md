## Exploration: BACKLOG.md item #3 — API operational foundation

### Current State

`apps/api` is a minimal NestJS/Fastify skeleton. `src/main.ts` creates a `NestFastifyApplication` with `FastifyAdapter` and listens on hard-coded port `3000` at `0.0.0.0`. `AppModule` only registers `AppController`, and `GET /` returns `{ status: 'ok' }`. The only API test directly instantiates the controller; it does not create an application or exercise HTTP behavior.

The API package currently depends on `@nestjs/common`, `@nestjs/core`, and `@nestjs/platform-fastify` `^12.0.1`, Fastify `^5`, `reflect-metadata`, and RxJS. Its TypeScript build is explicitly CommonJS with `moduleResolution: node10`, while the workspace uses Node 24 and npm 12. Root lint, typecheck, Vitest, and build gates already cover the API. No configuration module, environment schema, global exception filter, request correlation, structured logger, health module, or dependency health indicator exists.

The root and API manifests do not yet declare the operational dependencies. The current lockfile happens to contain `pino@10.3.1` and `zod@4.5.4` as development/transitive entries, but they are not API dependencies and must not be treated as an existing foundation.

The OpenSpec context is stale in one respect: `openspec/config.yaml` still describes a planning-only workspace with no projects, although `apps/api`, `apps/web`, the quality workflow, and the archived prerequisite state are present. This exploration uses the real application files and the canonical `monorepo-workspace` specification; it does not recommend changing SDD metadata as part of item #3.

#### Locked decisions and conventions

The following source excerpts are binding evidence rather than new decisions:

> “La API se implementará con una versión estable y soportada de Node.js, TypeScript y NestJS usando el adaptador Fastify.” — ADR-0005

> “Base path: `/api/v1`.” — `TECH-DESIGN.md`, section 7.1

> “Errores `application/problem+json` con `type`, `title`, `status`, `detail`, `code`, `traceId` y errores por campo opcionales.” — `TECH-DESIGN.md`, section 7.1

> “Logs JSON incluyen `timestamp`, nivel, servicio, entorno, `traceId`, ruta, estado y duración, sin datos sensibles.” — `TECH-DESIGN.md`, section 11

> “`GET /health/live` prueba el proceso; `GET /health/ready` comprueba dependencias imprescindibles con timeout.” — `TECH-DESIGN.md`, section 11

> “La API clasificará errores de entrada, autenticación, autorización, ausencia, conflicto, límite y dependencia no disponible mediante estados HTTP y el formato uniforme definido en OpenAPI.” — ADR-0010

> “Los mensajes para usuarios no expondrán trazas, SQL, tokens ni detalles internos. Los logs estructurados incluirán un identificador de correlación y contexto técnico seguro.” — ADR-0010

> “No se incorporarán colas, outbox ni circuit breakers distribuidos al MVP.” — ADR-0010

The REST/OpenAPI boundary, bearer-token handoff from the Next.js BFF, and explicit command endpoints are accepted by ADR-0003. OpenAPI publication and client generation are item #10, not this change. ADR-0008 keeps privileged connection credentials and internal configuration in Railway or the platform secret manager, not in the repository or frontend.

### Affected Areas

- `apps/api/package.json` — add only the runtime operational libraries selected for configuration, logging, and health. Keep them runtime dependencies; do not classify them as quality tooling.
- `package-lock.json` — refresh the immutable workspace lockfile after the API manifest changes. No root dependency change is otherwise needed.
- `apps/api/src/main.ts` — read validated configuration, configure Fastify request identity, install the global problem-details filter/logger integration, apply the `/api/v1` convention, and expose the documented unversioned health paths.
- `apps/api/src/app.module.ts` — register global configuration, the logger module, and the health module without adding domain or persistence modules.
- `apps/api/src/config/*` — pure environment schema/parser and typed configuration access. The initial schema should contain only foundation settings such as `NODE_ENV`, `PORT`, `HOST`, and `LOG_LEVEL`; it must not invent database, Auth, or Storage requirements.
- `apps/api/src/common/errors/*` — global Fastify-compatible exception filter, stable machine codes, safe titles/details, and optional field-error normalization.
- `apps/api/src/common/request/*` — bounded request/trace identifier creation and propagation to response errors and log context. Prefer Fastify request identity over Nest request-scoped business dependencies.
- `apps/api/src/health/*` — liveness/readiness controller and app-level indicators. Readiness must not require Prisma, PostgreSQL, Supabase Auth, or Storage in this change.
- `apps/api/src/**/*.spec.ts` — Vitest coverage for env parsing, exception mapping, correlation propagation, and health responses. Add at least one HTTP-level Fastify injection test without opening a listening server.
- `apps/api/.env.example` (optional) — document non-secret local foundation variables if the proposal chooses to add it; never add real values or secrets.

No Prisma schema, migration, database client, Supabase SDK, JWT/JWKS guard, OpenAPI generator/decorator setup, BFF route, business module, deployment file, or environment-provider configuration belongs here.

### Approaches

#### 1. Environment validation

| Approach | Pros | Cons | Complexity |
|---|---|---|---|
| `@nestjs/config` with native Joi `validationSchema` | First-class Nest integration; fail-fast startup; concise schema for `PORT`, host, environment, and log level; separates process configuration from application code | Requires a direct Joi runtime dependency; exact unknown-variable policy and defaults still need to be specified; does not automatically provide future DTO types | Low |
| `@nestjs/config` with a custom Zod `validate` function | Typed parsed result; expressive refinements; can be reused by future server-only schemas; Zod has a CJS-compatible `require` export | More adapter code around `ConfigModule`; the schema/result contract must be maintained manually; current lockfile presence is only transitive and not evidence of API adoption | Medium |
| `class-validator`/`class-transformer` environment class | Familiar Nest decorators and potentially reusable DTO conventions | More reflection/decorator coupling for process configuration; weaker fail-fast schema ergonomics; no design or codebase signal currently prefers it | Medium |

The design is silent on the validation library. Recommend `@nestjs/config` plus Joi for this narrow foundation because its native schema path minimizes custom integration. Validate numeric/range constraints, fail before the server listens, use a local default for `PORT` (`3000`), and permit unrelated platform-provided environment keys while rejecting or ignoring only values the application actually reads. Do not add future persistence/auth secrets to make the foundation boot.

#### 2. Uniform error filter and envelope

| Approach | Pros | Cons | Complexity |
|---|---|---|---|
| One global `ExceptionFilter` producing `application/problem+json` | Directly implements the locked envelope; centralizes safe mapping and trace IDs; catches framework and future domain exceptions consistently | Must normalize Nest validation exceptions and unknown errors carefully; Fastify uses `FastifyReply`, not Express response methods | Medium |
| Per-controller exception responses plus shared exception factories | Local control and straightforward controller tests | Easily drifts across future modules; cannot guarantee uniform unknown-error and correlation behavior | High over time |

Recommend a global filter. Map the locked categories to `401`, `403`, `404`, `409`, `422`, `429`, and `503`; reserve `500` for unexpected failures. The response should contain `type`, `title`, `status`, `detail`, `code`, and `traceId`, with a stable `fieldErrors` structure only when input validation supplies field data. User-facing `detail` must never contain stack traces, SQL, tokens, cookies, secrets, or signed URLs. The precise URI convention for `type`, code names, and field-error member names remains an item-level decision for the proposal/spec.

The filter must obtain `FastifyReply`, set the content type explicitly, and call `status(...).send(...)`. It must not assume Express `Response`, Express middleware, or Express error shapes.

#### 3. Logging

| Approach | Pros | Cons | Complexity |
|---|---|---|---|
| Nest built-in `Logger` with a small JSON adapter | No new logger ecosystem; simplest dependency surface; easy unit testing | Request context, JSON serialization, redaction, duration, and error serialization become custom code; less consistent with Railway log ingestion | Medium |
| `pino` with `nestjs-pino` and `pino-http` | Native structured JSON; request duration/status context; Nest logger integration; serializers and redaction support; good fit for a persistent Fastify service | Adds peer-version coordination and Fastify-specific setup; careless serializers can leak headers or request data | Medium |

Recommend Pino. Configure levels from validated `LOG_LEVEL`, service/environment fields, normalized route (not raw query strings), status, duration, and the request `traceId`. Redact authorization, cookies, password-like fields, secrets, SQL, and complete signed URLs; do not log request bodies by default. Ensure Nest internal logs and request logs use the same Pino pipeline.

#### 4. Tracing depth and correlation

| Approach | Pros | Cons | Complexity |
|---|---|---|---|
| Request correlation only: Fastify request ID plus bounded context propagation | Satisfies the design's explicit `traceId`/correlation requirement; works locally and on Railway; no exporter, collector, or sampling configuration; easy to include in errors and logs | Not distributed tracing or span visualization; propagation convention must be frozen | Low/Medium |
| OpenTelemetry SDK, HTTP instrumentation, and exporters | Real spans across the BFF/API/dependencies; future-ready distributed diagnostics | Adds several packages, exporter/runtime configuration, sampling and privacy decisions, and operational infrastructure not requested by the design | High |

The documents require a correlation identifier but do not require OpenTelemetry, spans, exporters, or metrics. Recommend request correlation only for #3. Generate a cryptographically random, bounded opaque ID when absent, validate any accepted inbound ID to prevent log injection, expose the same ID in the problem body and a response header, and make it available to `nestjs-pino`. Freeze the header name and inbound-trust policy in the spec; `x-trace-id` is the simplest API-owned recommendation. Revisit OTel only when a cross-service tracing requirement is explicitly added.

#### 5. Health endpoint shape

| Approach | Pros | Cons | Complexity |
|---|---|---|---|
| `@nestjs/terminus` with separate `/health/live` and `/health/ready` checks | Matches the documented paths; provides standard status/indicator handling and HTTP `503` behavior; can add a Prisma indicator in item #4 without replacing the controller | Native failure details need safe filtering and a deliberate relationship to the problem envelope; adds a dependency | Medium |
| Small hand-written health controller | No additional library; ideal for the current no-dependency readiness semantics | Reimplements indicator/status conventions and future extension points; greater drift risk when #4 adds database readiness | Low initially, Medium later |

Recommend `@nestjs/terminus` with the documented unversioned paths. `GET /health/live` returns a minimal success body when the process is running and performs no dependency call. `GET /health/ready` checks only initialized foundation components in #3 and returns `200` when this application scope can accept traffic, `503` otherwise, with no sensitive diagnostics. For consistency with the API error rule, the proposal should decide whether a readiness failure uses a safe problem-details body or Terminus's machine-oriented health body; the recommendation is problem-details on non-2xx and a minimal health body on success. Item #4 may add a bounded Prisma/PostgreSQL readiness indicator, without changing liveness.

### Boundary Analysis

#### In scope for item #3

- NestJS/Fastify operational bootstrap and validated, environment-driven host/port/log-level configuration.
- Stable `/api/v1` business API prefix convention, while keeping `/health/live` and `/health/ready` outside the versioned prefix for platform probes. Preserve or explicitly retire the skeleton root route in the proposal; the technical design does not define it.
- Global RFC 7807-style/problem-details error behavior with the locked fields, HTTP category mapping, safe messages, optional field errors, and a correlated trace ID.
- Structured JSON request/application logs, Nest logger integration, duration/status/route context, and mandatory redaction.
- Correlation/request ID propagation only; no distributed tracing backend.
- Liveness and application-only readiness checks that work with no database.
- Unit and Fastify injection tests that do not start a listening server or call external services.

#### Explicitly out of scope

- Prisma, PostgreSQL connectivity, migrations, transactions, connection pools, or database health indicators. Item #4 independently depends on #1 and #2, so #3 must not make #4 a prerequisite.
- Supabase Auth, JWT/JWKS validation, roles, profiles, Storage, signed URLs, or any business/domain module.
- OpenAPI publication, Swagger decorators, generated client output, or contract compatibility automation; those are item #10. The foundation only preserves REST, `/api/v1`, JSON, and problem-details behavior for later documentation.
- Next.js BFF routes, cookies, CSRF, frontend error rendering, TanStack Query, and responsive UI.
- Railway/Vercel deployment files, production environment provisioning, migration release jobs, and preview/production separation; those are item #11. The code must nevertheless honor environment-driven configuration and the ADR-0008 secret boundary.
- Authentication and registration features in items #12–#13, business validation rules, retries, queues, outbox, circuit breakers, metrics, and alerting.

The readiness tension is intentional: the approved design says readiness checks indispensable dependencies, but the item has no database or external dependency and must remain independently implementable. For this change, “ready” should mean the API foundation initialized successfully; item #4 can add the first external dependency check with its own timeout.

### Capability Impact

Recommend adding a **new** capability at `openspec/specs/api-foundation/spec.md` (or the equivalent capability name selected by proposal) with requirements for validated runtime configuration, uniform problem responses, correlation/structured logging, and health probes. Do **not** modify `openspec/specs/monorepo-workspace/spec.md`: its 18 workspace and quality requirements remain true, and the API skeleton requirement is not contradicted by adding operational behavior. The API manifest and lockfile are implementation prerequisites, not a reason to expand the monorepo capability.

### Registry Reality Check

Observed with `npm view <package> version` on 2026-09-01:

| Package | Latest reported stable version | Relevant observation |
|---|---:|---|
| `@nestjs/config` | `12.0.0` | Peer-compatible with Nest common `^11.0.0 || ^12.0.0` |
| `zod` | `4.5.4` | Available as a CJS-compatible dual-publish package; not a direct API dependency today |
| `class-validator` | `0.15.1` | No design preference; not recommended for foundation env parsing |
| `joi` | `18.2.5` | Recommended with the native `@nestjs/config` schema path |
| `pino` | `10.3.1` | `pino` reports Node `>=20`; compatible with the workspace's Node 24 line |
| `nestjs-pino` | `5.0.0` | Peers include Nest core/common `^11.0.8 || ^12.0.0`, Pino `^10.0.0`, and `pino-http` `^11.0.0`; reports Node `>=22.12.0` |
| `@nestjs/terminus` | `12.0.0` | Peer-compatible with Nest core/common `^11.0.0 || ^12.0.0`; optional integration peers include Prisma and other adapters |

OpenTelemetry packages were intentionally not queried: no accepted design or ADR requires OTel, and the recommended #3 path is correlation-only. If the requirement changes to distributed tracing, perform a new registry and compatibility check rather than adding OTel implicitly.

### Open Decisions

1. **Environment schema and defaults** — Recommend `@nestjs/config` + Joi; freeze the exact foundation variables, `PORT` default/range, host binding, `NODE_ENV` values, and `LOG_LEVEL` values. Do not require future database/Auth/Storage variables.
2. **Unknown environment keys** — Recommend allowing unrelated platform keys while validating every consumed key; never print the environment or validation values.
3. **Problem code and type conventions** — Recommend stable uppercase machine codes with a deterministic `type` derived from the code; freeze the `fieldErrors` member shape in the spec.
4. **Correlation header and trust** — Recommend generated IDs with validated optional `x-trace-id` input and the same response header; reject oversized/malformed values and never trust arbitrary text for logs.
5. **Health failure body** — Recommend a safe `application/problem+json` response for `503`, with minimal health JSON on successful probes; ensure platform consumers rely on status, not internal details.
6. **Root and prefix compatibility** — Recommend excluding health routes from the `/api/v1` global prefix and preserving `GET /` only if a skeleton smoke check still needs it; the design defines neither a root response nor a versioned health path.
7. **Test boundary** — Recommend direct unit tests for pure parsers/filter mapping and Fastify `inject()` integration tests for content type, headers, status, and health, with no external service or open listener.

### Risks

- NestJS 12 packages are consumed by a CommonJS skeleton using `moduleResolution: node10`; ESM-first package exports may require a deliberate TypeScript/module-resolution adjustment or verified import form without casually converting the whole API to ESM.
- Fastify response and exception shapes differ from Express. An Express-oriented filter, interceptor, or middleware can fail at runtime even when TypeScript compiles.
- `nestjs-pino` requires compatible Nest, Pino, and `pino-http` versions and can leak authorization or cookie headers if serializers/redaction are not explicit. Its current Node requirement is satisfied only because the workspace pins Node 24.
- A vague “tracing” requirement can expand into OpenTelemetry infrastructure, exporters, sampling, and cross-service propagation. The accepted sources currently justify only correlation IDs.
- Vitest baseline tests are controller-only. Bootstrap, filter, request-context, and health behavior need isolated tests that do not violate the workspace rule against starting a server or using an external service.
- Hard-coded port behavior is currently not suitable for Railway or parallel Windows development. Invalid or conflicting `PORT` values should fail clearly before listening; local defaults must not mask malformed explicit values.
- Readiness can falsely claim full service availability if it is implemented as a future database check now, or if it returns success without a clear application-only meaning. The #4 extension point must remain explicit.
- The root quality gates use an immutable lockfile and cross-platform npm scripts. Adding direct API runtime libraries requires a lockfile refresh and must not introduce shell-specific scripts or root runtime dependency leakage.
- The current OpenSpec configuration's planning-only project discovery is inconsistent with the real scaffold. Correcting that metadata is a separate SDD concern, not an implicit part of this API feature.

### Recommendation

Proceed with a new `api-foundation` capability and the following bounded implementation: `@nestjs/config` with Joi for fail-fast foundation configuration; `nestjs-pino` plus Pino and its `pino-http` peer for redacted structured JSON logs; `@nestjs/terminus` for the two unversioned health probes; a Fastify-native global problem-details filter; and generated request correlation IDs without OpenTelemetry. Keep readiness app-only until item #4 introduces a bounded database indicator. Freeze the six open convention choices in the proposal/spec, add focused Vitest and Fastify injection coverage, and leave Prisma, OpenAPI generation, auth, BFF, and deployment work to their backlog items.

### Ready for Proposal

Yes. The accepted architecture and current code are sufficiently understood for proposal work. The orchestrator can auto-select the recommendations above; the proposal should record the exact environment keys, error code/type and field-error shapes, correlation header policy, health failure body, and root-prefix compatibility as explicit item-level decisions.
