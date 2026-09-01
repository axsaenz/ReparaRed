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
`GET /health/live` MUST remain unauthenticated, process-only, minimal 200 JSON, and call no dependency. `GET /health/ready` MUST be unauthenticated; without a database it MUST retain foundation-only 200/503 behavior; with one configured it MUST run a bounded, timed query, returning minimal 200 when ready or a safe 503 problem when unavailable. It MUST never crash or leak connection details.

#### Scenario: No-database probes
- GIVEN external services are unavailable and no database is configured
- WHEN both probes run with the foundation ready or not
- THEN live is minimal 200; ready returns foundation-appropriate 200 or safe 503

#### Scenario: Database failure
- GIVEN a configured database is unreachable
- WHEN readiness performs its bounded check
- THEN it returns safe 503, while live remains 200 and the process survives

### Requirement: Versioned API surface
Business routes MUST use `/api/v1`; `/`, `/health/live`, and `/health/ready` MUST remain unversioned. `GET /` MUST return `200 {"status":"ok"}`.

#### Scenario: Public path routing
- GIVEN a client requests smoke, health, or business routing
- WHEN routing occurs
- THEN only business routing requires `/api/v1`

### Requirement: Boot-time dependency discipline
The foundation MUST start offline and MUST NOT require a live database, object storage, or identity provider. A configured database MAY exist, but bootstrap MUST perform no dependency network I/O or eager connection; access is deferred to first use/readiness.

#### Scenario: Offline boot
- GIVEN valid foundation configuration and unavailable external services
- WHEN the application starts without a database URL
- THEN startup succeeds without external calls

#### Scenario: Configured offline DB
- GIVEN a valid database URL whose server is unavailable
- WHEN bootstrap completes
- THEN startup succeeds without database I/O; readiness later reports its state

### Requirement: Foundation testability
These behaviors MUST be verifiable with unit-level and in-process HTTP tests that open no listening socket or call external services.

#### Scenario: In-process verification
- GIVEN foundation behaviors are exercised in a test process
- WHEN assertions run
- THEN statuses, headers, bodies, logs, and mappings are observable without a listener

### Requirement: Persistence configuration contract
The runtime database URL MUST use only `DATABASE_URL`. Supplied syntax MUST be validated; its value MUST NOT be logged, echoed, or committed. `DIRECT_URL` MUST stay outside runtime configuration for migrations. Missing URL MUST be tolerated at test/dev boot.

#### Scenario: Happy configuration
- GIVEN a valid `DATABASE_URL` and names-only documentation
- WHEN runtime configuration loads
- THEN validation succeeds without emitting the URL or consuming `DIRECT_URL`

#### Scenario: Invalid/absent configuration
- GIVEN malformed `DATABASE_URL`, or no URL in test/dev
- WHEN boot configuration is validated
- THEN failure is safe, absence is tolerated, and no value is exposed

### Requirement: Lazy process-scoped data client
Exactly one data client instance MUST exist per process. Connection MUST be deferred until first use/readiness; construction, module initialization, and import MUST NOT connect. Shutdown MUST release it; bounded failures MUST report readiness down safely, without crashing or exposing internals.

#### Scenario: Lazy use
- GIVEN a process with a valid configured database
- WHEN the client is constructed, first used, and shut down
- THEN construction is connection-free, first use connects, and shutdown releases it

#### Scenario: Unreachable database
- GIVEN a configured database that cannot be reached
- WHEN bounded readiness executes
- THEN it reports readiness down and keeps the process alive without details

### Requirement: Reproducible migration baseline
The repository MUST contain one committed, versioned initial PostgreSQL migration baseline and provider lock. It MUST contain no domain tables, enums, or extensions; destructive schema auto-sync MUST be prohibited. Verification MUST record live apply → re-apply → status as an unsatisfied pending gate until disposable PostgreSQL exists, and MUST NOT claim live verification before then.

#### Scenario: Live gate
- GIVEN a disposable PostgreSQL instance exists
- WHEN the baseline is applied, re-applied, and status is checked
- THEN all operations succeed against the empty versioned baseline

#### Scenario: Pending gate
- GIVEN no disposable PostgreSQL instance exists
- WHEN migration acceptance is assessed
- THEN the live gate remains recorded as unsatisfied

### Requirement: Migration/runtime connection separation
Migrations MUST use direct `DIRECT_URL`; runtime queries MUST use pooled `DATABASE_URL`. Cross-platform npm scripts named `prisma:generate`, `prisma:migrate:deploy`, and `prisma:migrate:status` MUST exist and MUST NOT embed credentials.

#### Scenario: Separate paths
- GIVEN both documented connection names are supplied
- WHEN runtime queries and migration commands run
- THEN each uses its assigned URL and all scripts are invocable

#### Scenario: Unsafe/missing commands
- GIVEN a URL is missing or a script embeds a credential
- WHEN configuration and scripts are checked
- THEN checking fails safely without disclosing credentials
