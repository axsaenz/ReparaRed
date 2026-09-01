# API Foundation Specification

## Purpose

Define the dependency-free operational contract for the API foundation.

## Requirements

### Requirement: Fail-fast validated configuration
The API MUST validate consumed `NODE_ENV`, `PORT`, `HOST`, and `LOG_LEVEL` before listening. Defaults, including `PORT=3000`, apply only when absent; invalid values MUST abort startup with a clear non-sensitive message. Unrelated keys MUST pass; raw configuration values MUST NOT be exposed.

#### Scenario: Defaulted or invalid configuration
- GIVEN consumed values are valid with absent `PORT`, or explicitly invalid
- WHEN startup validates
- THEN valid values use the default without exposure; invalid values abort before listening with a safe message

### Requirement: Uniform problem responses
Every error MUST use `application/problem+json` with `type`, `title`, `status`, `detail`, `code`, and `traceId`. Codes MUST be stable uppercase; `type` MUST deterministically be `urn:reparared:error:{CODE}`. Optional `fieldErrors` MUST map fields to stable message arrays. Details MUST exclude traces, SQL, tokens, cookies, secrets, and signed URLs.

| Category | Status/code |
|---|---|
| Input, authentication, authorization | 400/`INPUT_INVALID`; 401/`AUTHENTICATION_REQUIRED`; 403/`FORBIDDEN` |
| Absence, conflict, semantic input | 404/`NOT_FOUND`; 409/`CONFLICT`; 422/`SEMANTIC_INVALID` |
| Rate limit, unavailable dependency, unexpected | 429/`RATE_LIMITED`; 503/`DEPENDENCY_UNAVAILABLE`; 500/`INTERNAL_ERROR` |

#### Scenario: Unknown route and unsafe failure
- GIVEN an unknown route or unsafe error
- WHEN the error is rendered
- THEN the unknown route returns 404 and every problem has safe detail and deterministic type

### Requirement: Request correlation
Every request MUST receive one bounded opaque ID. Accept `x-trace-id` only for 1–128 characters matching `[A-Za-z0-9._-]`; otherwise generate one. Echo the ID in response `x-trace-id`, problem bodies, and log context.

#### Scenario: Valid and invalid trace input
- GIVEN valid, malformed, or oversized `x-trace-id` input
- WHEN the request completes
- THEN the valid value is echoed, or a safe generated ID replaces it without logging input

### Requirement: Structured safe logs
Request logs MUST be one-line JSON with timestamp, level, service, environment, traceId, normalized route, status, and duration; query data MUST be omitted. Authorization, cookies, password-like fields, secrets, and signed URLs MUST be redacted; bodies MUST NOT be logged by default. Internal output MUST use the same pipeline; `environment` MAY be only a normalized non-sensitive label.

#### Scenario: Request record and sensitive input
- GIVEN a request includes credentials or password-like data
- WHEN logs are emitted
- THEN required fields remain parseable while sensitive values and bodies are absent or redacted

### Requirement: Dependency-free health probes
`GET /health/live` MUST be unauthenticated, return minimal 200 JSON, and call no dependency. `GET /health/ready` MUST be unauthenticated, return minimal 200 JSON when foundation-ready or a safe 503 problem otherwise. Its contract MUST reserve a future database extension without invoking one now.

#### Scenario: Probe outcomes
- GIVEN external services are unavailable and foundation is ready or not
- WHEN probes run
- THEN live returns minimal 200 without calls; ready returns minimal 200 or safe 503 problem

### Requirement: Versioned API surface
Business routes MUST use `/api/v1`; `/`, `/health/live`, and `/health/ready` MUST remain unversioned. `GET /` MUST return `200 {"status":"ok"}`.

#### Scenario: Public path routing
- GIVEN a client requests smoke, health, or business routing
- WHEN routing occurs
- THEN only business routing requires `/api/v1`

### Requirement: Boot-time dependency discipline
The foundation MUST start offline and MUST NOT require database, object storage, or identity provider.

#### Scenario: Offline startup
- GIVEN network and external services are unavailable
- WHEN valid configuration is used
- THEN startup succeeds without external calls

### Requirement: Foundation testability
These behaviors MUST be verifiable with unit-level and in-process HTTP tests that open no listening socket or call external services.

#### Scenario: In-process verification
- GIVEN foundation behaviors are exercised in a test process
- WHEN assertions run
- THEN statuses, headers, bodies, logs, and mappings are observable without a listener
