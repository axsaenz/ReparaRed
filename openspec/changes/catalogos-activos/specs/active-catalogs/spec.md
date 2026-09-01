# Active Catalogs Specification

## Purpose

Define locked catalogs, transactional seeding, and public active-only reads. Existing catalog tables and migrations remain unchanged.

## Requirements

### Requirement: Transactional seed

The seed MUST atomically converge both datasets by slug/UBIGEO, preserve IDs, update fields including `active`, never delete/truncate, and use the CLI connection, not the runtime pool.

#### Scenario: Convergence
- GIVEN matching keys
- WHEN CLI seed runs
- THEN IDs persist; fields converge

#### Scenario: Rollback
- GIVEN upsert failure
- WHEN seed ends
- THEN rollback; no deletion

### Requirement: Locked categories

The seed MUST contain exactly these stable pairs: Gasfitería y tuberías (`gasfiteria-y-tuberias`), Electricidad básica (`electricidad-basica`), Reparación de muebles (`reparacion-de-muebles`), and Limpieza especializada (`limpieza-especializada`). Slugs MUST NOT be silently renamed; membership changes require versioning.

#### Scenario: Locked shape
- GIVEN approved data
- WHEN shape is checked
- THEN four locked pairs exist

#### Scenario: Unversioned drift
- GIVEN unversioned change
- WHEN validation occurs
- THEN it is not silently applied

### Requirement: District integrity

The seed MUST contain 50 unique six-digit districts: 43 codes `150101–150143` with Lima/Lima and 7 codes `070101–070107` with Callao/Callao. Callao names MUST be Callao, Bellavista, Carmen de la Legua, La Perla, La Punta, Ventanilla, and Mi Perú. It MUST record best-effort INEI provenance pending the official extract; re-seed MUST correct rows without schema changes.

#### Scenario: Locked boundary
- GIVEN committed data
- WHEN shape is checked
- THEN 50 unique rows match ranges and regions

#### Scenario: Correction
- GIVEN corrected UBIGEO
- WHEN re-seeded
- THEN fields update; no schema/deletion

### Requirement: Public category reads

`GET /api/v1/categories` MUST be unauthenticated and return `application/json` `{ "data": [...] }` with only `{ id, slug, name }`, active rows, and slug order. An empty active set MUST return `200` with empty `data`.

#### Scenario: Category list
- GIVEN active/inactive rows
- WHEN unauthenticated `GET` runs
- THEN active exact projection returns in slug order

#### Scenario: Empty categories
- GIVEN no active rows
- WHEN `GET` runs
- THEN `200` returns empty `data`

### Requirement: Public district reads

`GET /api/v1/districts` MUST be unauthenticated and return `application/json` `{ "data": [...] }` with only `{ id, ubigeoCode, name, province, department }`, active rows, and UBIGEO order. The persistence-to-`ubigeoCode` mapping MUST remain stable.

#### Scenario: District list
- GIVEN active/inactive district rows
- WHEN unauthenticated `GET` runs
- THEN active exact projection returns in UBIGEO order

#### Scenario: Empty districts
- GIVEN no active rows
- WHEN `GET` runs
- THEN `200` returns empty `data`, no extras

### Requirement: Active-only policy

Catalog reads MUST filter active records in the data layer. Omitted or true `active` MUST be accepted; false MUST produce semantic 422; malformed values MUST produce input 400. Inactive visibility requires a separate authorized contract.

#### Scenario: Active selection
- GIVEN omitted/true `active`
- WHEN query runs
- THEN data layer selects active only

#### Scenario: Invalid selection
- GIVEN false/malformed `active`
- WHEN request runs
- THEN 422/400 respectively; no inactive data

### Requirement: Bounded complete lists

Catalog endpoints MUST return complete bounded lists without pagination as the documented MVP reference-catalog exception. Ordering MUST be natural key ascending, then identifier ascending.

#### Scenario: Complete list
- GIVEN bounded catalogs
- WHEN either `GET` runs
- THEN all active rows return once, ordered

#### Scenario: Tie order
- GIVEN equal natural keys
- WHEN list sorts
- THEN identifier ASC breaks ties

### Requirement: Safe catalog failures

Catalog read failures MUST map to safe 503 `application/problem+json` with `DEPENDENCY_UNAVAILABLE`; unexpected errors MUST map to safe 500. Responses MUST NOT disclose SQL, connection details, or internal messages.

#### Scenario: Normal read
- GIVEN dependency success
- WHEN `GET` completes
- THEN normal 200 envelope returns

#### Scenario: Sanitized failure
- GIVEN internal failure details
- WHEN `GET` handles it
- THEN safe 503/500 omits details

### Requirement: Schema stability

This capability MUST NOT alter existing catalog tables or migrations; identity-persistence structures and UBIGEO mapping remain the physical contract.

#### Scenario: Existing schema
- GIVEN existing identity schema
- WHEN applied
- THEN no schema/migration changes

#### Scenario: Schema expansion
- GIVEN schema mutation proposed
- WHEN reviewed
- THEN it is out of scope

### Requirement: Seed acceptance limits

Live acceptance—post-seed counts and idempotent real-database re-seed—MUST remain a RECORDED PENDING GATE until disposable PostgreSQL exists. Offline shape, fake-client seeder, and mocked-HTTP checks MUST be labeled offline, never database proof.

#### Scenario: Offline evidence
- GIVEN no disposable PostgreSQL
- WHEN checks run
- THEN results are labeled offline only

#### Scenario: Pending live gate
- GIVEN offline pass without DB
- WHEN acceptance is reported
- THEN live gate remains RECORDED PENDING
