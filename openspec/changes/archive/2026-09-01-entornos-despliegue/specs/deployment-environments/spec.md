# Deployment Environments Specification

## Purpose

Define separated environments, controlled releases, isolated previews, safe configuration, and auditable gates; live provisioning remains unclaimed.

## Requirements

### Requirement: Environment Separation and Variable Matrix

The system MUST define at least development, preview, and production; previews MUST NOT use production database/storage. A names-only matrix MUST list consumed variables per application/class.

| Application | Classes | Server-only names | Public names |
|---|---|---|---|
| API | development, preview, production | `DATABASE_URL`, `DIRECT_URL`, `NODE_ENV`, `PORT`, `HOST`, `LOG_LEVEL`, `AUTH_ISSUER_URL`, `AUTH_JWKS_URL`, `STORAGE_SERVICE_KEY`, `STORAGE_BUCKET_NAME` | none |
| Web | development, preview, production | `API_ORIGIN` | `NEXT_PUBLIC_APP_ENV` |

#### Scenario: Happy
- GIVEN all applications/classes
- WHEN matrix reviewed
- THEN names/classifications have no values

#### Scenario: Edge
- GIVEN preview names production resources
- WHEN static validation runs
- THEN validation fails before deployment

### Requirement: Serialized Production Release

Production MUST pass quality, run exactly one migration over the direct connection before API promotion, promote API before web, serialize releases, and smoke-test liveness/readiness/web without secrets.

#### Scenario: Happy
- GIVEN quality passed and lock free
- WHEN release executes
- THEN migration, API, web, smoke checks follow order

#### Scenario: Edge
- GIVEN quality failed or lock held
- WHEN release requested
- THEN no promotion starts; logs stay secret-free

### Requirement: Migration and Seed Discipline

Migrations MUST NOT run at replica startup. Idempotent catalog seed MUST run only at bootstrap or approved release. Records MUST capture apply, re-apply, status, and seed evidence.

#### Scenario: Happy
- GIVEN approved bootstrap
- WHEN migration and seed complete
- THEN four outcomes are recorded

#### Scenario: Edge
- GIVEN initialized environment
- WHEN replica restarts
- THEN migration and seed do not run

### Requirement: Isolated Preview Preflight

Pull-request previews MUST verify preview credentials and non-production database/storage before deployment. Missing credentials MUST cause auditable skip, never production fallback.

#### Scenario: Happy
- GIVEN credentials and isolated resources exist
- WHEN preflight runs
- THEN preview deployment proceeds

#### Scenario: Edge
- GIVEN a preview credential is absent
- WHEN preflight runs
- THEN it skips with reason and selects no production resource

### Requirement: Privilege and Connection Boundary

The web hosting platform MUST receive no privileged database/storage credentials. Public values MUST be non-privileged; runtime uses transaction-pool and migrations direct connection.

#### Scenario: Happy
- GIVEN hosting variables assigned
- WHEN assignments are checked
- THEN privilege and connection roles match

#### Scenario: Edge
- GIVEN a public value is privileged
- WHEN validation runs
- THEN configuration is rejected

### Requirement: Private Storage Bootstrap

The data platform bootstrap MUST create a private image bucket exposing objects only through short-lived signed access. Artifacts MUST be versioned, rerunnable, separate from domain migrations.

#### Scenario: Happy
- GIVEN a new or existing environment
- WHEN bootstrap runs twice
- THEN private policies persist without destructive duplication

#### Scenario: Edge
- GIVEN an object lacks valid signed access
- WHEN the data platform evaluates it
- THEN the object remains inaccessible

### Requirement: Configuration as Code

Code-representable hosting/platform settings MUST be committed: commands, health endpoint, runtime pin, project root. Other settings MUST be runbook steps; JSON/YAML MUST parse without credentials.

#### Scenario: Happy
- GIVEN committed configuration files
- WHEN parsers and scans run
- THEN files parse and contain no credentials

#### Scenario: Edge
- GIVEN a setting cannot be represented as code
- WHEN provisioning is reviewed
- THEN its runbook step and evidence are explicit

### Requirement: Secret Hygiene

Committed files MUST contain no credential values. Workflow commands MUST use CI environment secret names, never literals. Secret scans MUST run automatically.

#### Scenario: Happy
- GIVEN a workflow needs a secret
- WHEN tracked files are scanned
- THEN only named environment references remain

#### Scenario: Edge
- GIVEN a tracked file contains a credential-like value
- WHEN the automated scan runs
- THEN the quality gate fails without echoing it

### Requirement: Branch Protection Procedure

The runbook MUST define steps protecting main, requiring pull requests and the quality check, forbidding force-push/deletion. Application MUST remain a recorded pending gate.

#### Scenario: Happy
- GIVEN an administrator follows the runbook
- WHEN checklist is reviewed
- THEN rules and evidence locations are explicit

#### Scenario: Edge
- GIVEN only repository files are available
- WHEN readiness is assessed
- THEN branch protection remains pending

### Requirement: Pending-Gate Honesty

Data/API/web provisioning, live workflows, migration/seed evidence, and branch protection MUST remain pending until accounts, credentials, live evidence exist. Static evidence MUST NOT claim readiness.

#### Scenario: Happy
- GIVEN accounts and live evidence exist
- WHEN gates are reviewed
- THEN only evidenced gates may close

#### Scenario: Edge
- GIVEN only static files and checks exist
- WHEN readiness is reported
- THEN every live gate remains pending
