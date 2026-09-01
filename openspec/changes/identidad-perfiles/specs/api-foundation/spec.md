# Delta for API Foundation

## MODIFIED Requirements

### Requirement: Reproducible migration baseline
The repository MUST contain one committed, versioned initial PostgreSQL migration baseline and provider lock; migration #1 (the baseline) MUST contain no domain tables, enums, or extensions; SUBSEQUENT versioned domain migrations are EXPECTED as later capabilities add models; destructive schema auto-sync MUST remain prohibited; the live apply→re-apply→status pending-gate obligation is unchanged.

(Previously: The initial versioned migration was described as containing no domain schema without explicitly permitting later domain migrations.)

#### Scenario: Empty baseline
- GIVEN the provider lock and versioned migration #1 exist
- WHEN migration #1 is inspected
- THEN it contains no domain tables, enums, or extensions

#### Scenario: Subsequent domain migration
- GIVEN a later capability adds domain models
- WHEN a versioned migration follows the baseline
- THEN the domain migration is permitted and migration #1 remains empty

#### Scenario: Live gate
- GIVEN a disposable PostgreSQL instance exists
- WHEN the baseline is applied, re-applied, and status is checked
- THEN all operations succeed against the empty versioned baseline

#### Scenario: Pending gate
- GIVEN no disposable PostgreSQL instance exists
- WHEN migration acceptance is assessed
- THEN the live gate remains recorded as unsatisfied
