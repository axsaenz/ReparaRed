# Delta for api-foundation

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Dependency-free health probes
`GET /health/live` MUST remain unauthenticated, process-only, minimal 200 JSON, and call no dependency. `GET /health/ready` MUST be unauthenticated; without a database it MUST retain foundation-only 200/503 behavior; with one configured it MUST run a bounded, timed query, returning minimal 200 when ready or a safe 503 problem when unavailable. It MUST never crash or leak connection details.
(Previously: readiness was foundation-only and reserved a future database extension.)

#### Scenario: No-database probes
- GIVEN external services are unavailable and no database is configured
- WHEN both probes run with the foundation ready or not
- THEN live is minimal 200; ready returns foundation-appropriate 200 or safe 503

#### Scenario: Database failure
- GIVEN a configured database is unreachable
- WHEN readiness performs its bounded check
- THEN it returns safe 503, while live remains 200 and the process survives

### Requirement: Boot-time dependency discipline
The foundation MUST start offline and MUST NOT require a live database, object storage, or identity provider. A configured database MAY exist, but bootstrap MUST perform no dependency network I/O or eager connection; access is deferred to first use/readiness.
(Previously: startup was required to operate without a configured database dependency.)

#### Scenario: Offline boot
- GIVEN valid foundation configuration and unavailable external services
- WHEN the application starts without a database URL
- THEN startup succeeds without external calls

#### Scenario: Configured offline DB
- GIVEN a valid database URL whose server is unavailable
- WHEN bootstrap completes
- THEN startup succeeds without database I/O; readiness later reports its state
