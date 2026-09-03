# OpenAPI Contract Specification

## Purpose

Define publication, client generation, and compatibility guarantees for the versioned OpenAPI contract.

## Requirements

### Requirement: Contract publication

The API MUST publish one versioned OpenAPI contract document generated from implemented application metadata; the document MUST be deterministic for a given code state and committed as the consumer source of truth.

#### Scenario: Deterministic publication

- GIVEN the application code at a fixed commit
- WHEN the contract export runs twice without code changes
- THEN both generated documents are byte-identical

#### Scenario: Regeneration drift

- GIVEN a contract document committed at the prior commit
- WHEN code changes the documented surface and export is not re-run
- THEN a stale-check fails until the document is regenerated

### Requirement: Documented surface completeness

The contract MUST document every currently reachable public path — business catalog reads under `/api/v1` and unversioned system paths (`/`, `/health/live`, `/health/ready`) — with their success and error responses; no reachable path MAY be undocumented.

#### Scenario: Surface documented

- GIVEN the two catalog endpoints and three system paths are reachable
- WHEN the contract is inspected
- THEN all five paths appear with their 200 and error responses

#### Scenario: Undocumented path

- GIVEN a reachable public path exists
- WHEN it is absent from the contract
- THEN contract verification fails

### Requirement: Shared contract schemas

The contract MUST define reusable schemas for the problem-details envelope (including `type`, `title`, `status`, `detail`, `code`, `traceId`, optional `fieldErrors` and the 9 stable error codes), the `{data:[...]}` envelope, category and district projections exactly as served, the money object `{amount:"125.50",currency:"PEN"}`, RFC 3339 timestamps, and pagination `page`/`limit` components; pagination schemas MUST NOT be applied to catalog reads.

#### Scenario: Schemas present

- GIVEN the contract is parsed
- WHEN shared schemas are inspected
- THEN problem, data envelope, category, district, money, timestamp, and pagination components exist with the locked shapes

#### Scenario: Persistence leakage

- GIVEN Prisma entities exist
- WHEN contract schemas are inspected
- THEN no persistence entity appears as a contract schema

### Requirement: Conventions fidelity

Contract content MUST follow the locked conventions — `/api/v1` base path, `camelCase` JSON, opaque string IDs, RFC 3339, semantic status codes, deterministic `urn:reparared:error:{CODE}` type URIs; the contract MUST NOT alter runtime behavior.

#### Scenario: Conventions honored

- GIVEN the contract is generated
- WHEN conventions are checked
- THEN base path, casing, ID, timestamp, and error type conventions match the locked values

#### Scenario: Runtime mutation

- GIVEN contract generation is requested
- WHEN it would require changing runtime semantics
- THEN generation is rejected as documentation-only

### Requirement: Offline export discipline

Contract generation MUST succeed without any database connection, network listener, or external service; generation MUST fail safely with a non-zero exit rather than producing a partial document; this MUST be protected by a regression test.

#### Scenario: Offline export succeeds

- GIVEN no DATABASE_URL and no listener is available
- WHEN the export script runs
- THEN it writes a complete valid document and exits 0 with the app closed

#### Scenario: Eager initialization regression

- GIVEN a future module eagerly connects to a database on import
- WHEN the export runs
- THEN it fails safely and the regression test catches it

### Requirement: Generated client

The workspace MUST provide a generated TypeScript client package derived from the committed contract, exposing typed paths/schemas and a typed transport factory that receives base URL, fetch implementation, and headers from the caller; the client MUST NOT read cookies, store session state, handle tokens, or implement business rules; the client MUST compile under workspace typechecks.

#### Scenario: Client generated and compiles

- GIVEN the committed contract exists
- WHEN the generation runs and typecheck executes
- THEN typed client artifacts exist and typecheck passes

#### Scenario: Session leakage

- GIVEN the generated client is inspected
- WHEN its source is searched for cookie/session/token handling
- THEN no such logic exists

### Requirement: Artifact freshness

Committed contract and generated client artifacts MUST be verifiable as up-to-date; deterministic regeneration that differs from committed artifacts MUST fail verification.

#### Scenario: Fresh artifacts

- GIVEN committed artifacts match regeneration
- WHEN the stale-check runs
- THEN it passes

#### Scenario: Stale artifacts

- GIVEN committed artifacts differ from regeneration
- WHEN the stale-check runs
- THEN it fails with a non-zero exit

### Requirement: Compatibility detection

CI MUST compare the proposed contract against the base contract and fail on breaking changes while allowing additive changes within the current major version; when no base contract exists (first adoption), comparison MUST record an explicit baseline skip while generation, validation, and compilation remain mandatory.

#### Scenario: Breaking change detected

- GIVEN the base contract and a breaking proposed change (removed field, changed semantics)
- WHEN the diff runs in CI
- THEN it exits non-zero and blocks the change

#### Scenario: Additive change allowed

- GIVEN a new optional field is added
- WHEN the diff runs
- THEN it passes

#### Scenario: First baseline

- GIVEN no base contract exists
- WHEN the compatibility gate runs
- THEN it records a baseline-skip note and still requires generation/validation/compilation

### Requirement: Gate placement and portability

Contract verification MUST run in the quality pipeline after tests and before build; all contract commands MUST be cross-platform npm-syntax orchestration without shell-specific composition and without embedding credentials.

#### Scenario: Gate order

- GIVEN the quality workflow is inspected
- WHEN steps are ordered
- THEN test precedes contract checks which precede build

#### Scenario: Shell-specific composition

- GIVEN contract scripts are inspected
- WHEN their command strings are parsed
- THEN no `&&`, `;`, or shell variable expansions appear

### Requirement: Contract verification limits

Contract acceptance MUST be verifiable offline (document validity, determinism, client compilation, stale detection, gate wiring); behaviors requiring remote CI execution or future endpoints MUST be specified as obligations without claiming execution.

#### Scenario: Offline verifiable

- GIVEN no CI remote is available
- WHEN offline verification runs (validate, determinism, stale-check, typecheck, gate wiring inspection)
- THEN all checks pass without network

#### Scenario: Remote-only claim

- GIVEN a future endpoint is not yet implemented
- WHEN contract acceptance is assessed
- THEN it is not claimed as documented
