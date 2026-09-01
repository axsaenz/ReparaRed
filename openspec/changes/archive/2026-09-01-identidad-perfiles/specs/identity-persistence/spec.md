# Identity Persistence Specification

## Purpose

Define durable identity, profile, specialty, catalog-prerequisite, and offline integrity contracts.

## Requirements

### Requirement: Domain identity records
Each identity MUST contain an opaque UUID, one unique provider authentication subject, normalized email, exactly one role from `{CLIENT, TECHNICIAN}`, and UTC created/updated instants. Credentials MUST NOT be stored in the application database.

#### Scenario: Happy
- GIVEN valid identity inputs
- WHEN persistence creates it
- THEN required fields and UTC instants persist without credentials

#### Scenario: Edge
- GIVEN duplicate subject or credential input
- WHEN submitted
- THEN creation fails and credentials remain unstored

### Requirement: Role immutability
The persistence boundary MUST assign role only at creation; the database MUST reject all role updates.

#### Scenario: Happy
- GIVEN a new identity with allowed role
- WHEN created
- THEN the role is written once

#### Scenario: Edge
- GIVEN an existing identity
- WHEN its role is updated
- THEN the database rejects it

### Requirement: Client profile integrity
At most one client profile MUST exist per identity key. If present, it MUST contain a 2–100 non-whitespace name, E.164 phone (`+` plus 8–15 digits, first non-zero), existing district, and CLIENT identity.

#### Scenario: Happy
- GIVEN CLIENT identity and existing district
- WHEN a valid profile is persisted
- THEN one keyed profile is stored

#### Scenario: Edge
- GIVEN duplicate, invalid, orphan, or wrong-role profile
- WHEN written
- THEN the write fails

### Requirement: Technician profile integrity
At most one technician profile MUST exist per identity key. If present, it MUST contain a 2–100 non-whitespace professional name, 20–1000 character description, E.164 phone, integer years of experience `0–80`, and TECHNICIAN identity.

#### Scenario: Happy
- GIVEN a TECHNICIAN identity
- WHEN a valid profile is persisted
- THEN one keyed profile is stored

#### Scenario: Edge
- GIVEN duplicate, invalid, orphan, or wrong-role profile
- WHEN written
- THEN the write fails

### Requirement: Specialty uniqueness and references
A specialty MUST be unique by technician profile/category, reference both existing rows, have a category-first reverse index, and record UTC creation. Later operations MUST require at least one specialty to operate; no row constraint may count them.

#### Scenario: Happy
- GIVEN existing technician and category
- WHEN a new pair is persisted
- THEN UTC row and reverse index entry exist

#### Scenario: Edge
- GIVEN duplicate pair or missing reference
- WHEN added
- THEN the write fails

### Requirement: Catalog prerequisites
District and category structures MUST exist with locked fields: district internal ID, unique UBIGEO code, name, province, department, active state; category internal ID, unique slug, name, active state. This change MUST add no rows; seeds, active behavior, and reads are later.

#### Scenario: Happy
- GIVEN migration #2 is applied
- WHEN prerequisites are inspected
- THEN locked structures exist with zero rows

#### Scenario: Edge
- GIVEN seeding or reads are requested
- WHEN scope is assessed
- THEN this change adds none

### Requirement: Referential integrity policy
Foreign keys MUST reject nonexistent identity, profile, category, and district references. Deletes MUST be restrictive: no cascading business deletion and no physical deletion of business records.

#### Scenario: Happy
- GIVEN referenced rows exist
- WHEN a relation is written
- THEN the foreign key accepts it

#### Scenario: Edge
- GIVEN missing reference or business-row delete
- WHEN attempted
- THEN it is rejected without cascade or physical deletion

### Requirement: Versioned migration contract
The identity schema MUST be versioned migration #2 over an empty baseline. #2 MUST name keys, indexes, checks, and FKs; role immutability and profile-role matching MUST be explicit database rules. Live apply→re-apply→status on disposable PostgreSQL MUST remain a RECORDED PENDING GATE until such an instance exists.

#### Scenario: Happy
- GIVEN empty baseline and identity model
- WHEN migrations are reviewed
- THEN #2 follows #1 with named constructs and rules

#### Scenario: Edge
- GIVEN no disposable PostgreSQL instance
- WHEN acceptance is recorded
- THEN the live gate remains pending, not passed

### Requirement: Offline persistence contracts
Static contract assertions MUST verify models, enum members, bounds, named checks, trigger presence, FK delete rules, indexes, and physical snake_case mappings without a live database. Evidence MUST be labeled STATIC, never executed-SQL proof.

#### Scenario: Happy
- GIVEN schema and migration text offline
- WHEN static assertions run
- THEN required invariants are reported STATIC

#### Scenario: Edge
- GIVEN no live database
- WHEN results are reported
- THEN executed-SQL acceptance is not claimed
