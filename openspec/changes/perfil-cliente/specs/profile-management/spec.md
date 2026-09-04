# Profile Management Specification

## Purpose

Define authenticated client self-service editing through `PATCH /api/v1/me/profile`. This is a new capability; it does not add profile retrieval, UI consumption, or technician editing.

## Requirements

### Requirement: Authenticated owner-only editing

The operation MUST require a verified authenticated identity with persisted role `CLIENT`. The target MUST be derived from that identity; request-supplied identifiers MUST NOT select or authorize a profile. Unauthenticated requests MUST return the standard authentication problem.

#### Scenario: Client edits own profile
- GIVEN a verified identity whose persisted role is `CLIENT` and an existing own profile
- WHEN the client submits a valid profile update
- THEN only that identity's profile is updated and the response is successful

#### Scenario: Unauthenticated or non-client request
- GIVEN a request without valid authentication, or an authenticated identity with another persisted role
- WHEN the request reaches the editing operation
- THEN it returns `401` authentication or `403 FORBIDDEN`, respectively, without profile data

### Requirement: Partial update and complete response

The request MUST change only supplied editable fields; omitted fields MUST remain unchanged. A request supplying no fields MUST return `400 INVALID_INPUT`. Success MUST return the complete updated sanitized projection: `id`, `role`, and `profile{name, phone, districtId}`.

#### Scenario: One-field update
- GIVEN an existing client profile and a request containing only `phone`
- WHEN the update succeeds
- THEN name and district remain unchanged and the response contains the complete updated projection

#### Scenario: Empty update
- GIVEN an authenticated client submits an empty object or no recognized update field
- WHEN validation runs
- THEN the operation returns `400 INVALID_INPUT` and performs no update

### Requirement: Editable field contract

Exactly `name`, `phone`, and `districtId` MAY be edited. Name MUST contain 2–100 meaningful characters after trimming; phone MUST be E.164; email and role MUST NOT be editable through this surface or any profile-editing surface.

#### Scenario: Valid editable fields
- GIVEN a client supplies a valid name, E.164 phone, or district identifier
- WHEN the request is processed
- THEN the supplied values are persisted within their bounds

#### Scenario: Forbidden or malformed fields
- GIVEN a request includes email, role, an identifier such as `userId`, an unknown field, or an out-of-bounds value
- WHEN input validation runs
- THEN it returns `400 INVALID_INPUT` and changes neither identity nor profile data

### Requirement: Active district revalidation

When `districtId` is supplied, it MUST identify an existing active district at update time. District validation and profile update MUST occur in the same short transaction, and the owner's profile row MUST be locked before updating. A missing or inactive district MUST return `422 SEMANTIC_INVALID` with stable `fieldErrors.districtId`.

#### Scenario: Active district change
- GIVEN an authenticated client supplies an existing active district
- WHEN the profile update succeeds
- THEN the profile references that district and the transaction commits the complete valid result

#### Scenario: Missing or inactive district
- GIVEN the supplied district does not exist or is inactive
- WHEN the update is attempted
- THEN it returns the semantic district field error and leaves the profile unchanged

### Requirement: Absent profile handling

An authenticated `CLIENT` identity without an existing profile MUST receive generic `404 NOT_FOUND`. The operation MUST NOT create a profile or reveal whether another user's profile exists.

#### Scenario: Existing self-profile
- GIVEN an authenticated client has an existing profile
- WHEN a valid edit is submitted
- THEN the own profile is updated and returned

#### Scenario: Missing self-profile
- GIVEN an authenticated client has no profile row
- WHEN an edit is submitted
- THEN it returns generic `404 NOT_FOUND` with no other-user state

### Requirement: Safe error mapping

All failures MUST map in an `application/problem+json` response to the frozen codes: `401` authentication, `403 FORBIDDEN`, `404 NOT_FOUND`, `400 INVALID_INPUT`, `422 SEMANTIC_INVALID`, or `500 INTERNAL`. Responses MUST NOT expose persistence internals, other users' data, or identity-provider details.

#### Scenario: Known validation failure
- GIVEN a malformed request or invalid district
- WHEN the operation rejects it
- THEN it returns the corresponding standard problem code and no sensitive details

#### Scenario: Unexpected dependency failure
- GIVEN persistence or another dependency fails unexpectedly
- WHEN the failure is surfaced
- THEN it returns the standard internal problem without implementation or provider details

### Requirement: Versioned contract publication

The current-major OpenAPI contract MUST publish the PATCH operation, request and response schemas, security metadata, and declared error responses. The generated client MUST be regenerated, and the addition MUST be additive within the current major version.

#### Scenario: Contract generation
- GIVEN the editing operation is implemented
- WHEN contract generation and validation run
- THEN the path, schemas, errors, and generated client types are present and valid

#### Scenario: Breaking contract change
- GIVEN publication would remove or incompatibly alter an existing current-major contract
- WHEN contract checks run
- THEN publication MUST fail rather than claim an additive change

### Requirement: Offline verification boundaries

Orchestration, transaction intent, guard integration, and HTTP behavior MUST be verifiable offline with fake persistence and key fixtures. Live database locking, triggers, and transaction behavior; live provider flows; and UI consumption MUST be recorded as `PENDING GATE` and MUST NOT be claimed satisfied by any artifact.

#### Scenario: Offline evidence
- GIVEN fake persistence and authentication-key fixtures
- WHEN offline verification runs
- THEN it can verify authorization, update semantics, error mapping, transaction intent, and HTTP behavior

#### Scenario: Unavailable live evidence
- GIVEN no live database, provider, or UI environment is exercised
- WHEN verification is reported
- THEN each such gate is explicitly recorded pending and not reported as passing
