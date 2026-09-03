# Client Onboarding Specification

## Purpose

Define verified client onboarding, its domain and error behavior, contract surface, provider seam, and evidence limits.

## Requirements

### Requirement: Verified onboarding operation

The API MUST expose `POST /api/v1/onboarding/client` only with a verified trusted context from an identity-provider port containing provider subject, provider email, and verification state. Identity fields MUST NOT come from the body; credentials MUST NOT be accepted or persisted.

#### Scenario: Verified request
- GIVEN the port supplies a verified subject and email, and the body has only a valid profile
- WHEN the operation is invoked
- THEN onboarding proceeds without body-supplied identity or credentials

#### Scenario: Missing or unverified identity
- GIVEN the port supplies no identity or an unverified context
- WHEN the operation is invoked
- THEN it returns 401 `AUTHENTICATION_REQUIRED` and creates no domain record

### Requirement: Frozen email normalization

The API MUST trim and apply locale-independent lowercase to provider email before duplicate checks and persistence, with no provider-specific address rewriting.

#### Scenario: Normalized email
- GIVEN the provider email has whitespace or uppercase letters
- WHEN onboarding evaluates the email
- THEN both duplicate detection and the persisted copy use trimmed lowercase

#### Scenario: Provider-specific spelling
- GIVEN addresses differ only by provider-specific dot or plus rules
- WHEN onboarding compares them
- THEN neither address is rewritten under those rules

### Requirement: Atomic complete domain creation

A first-time onboarding MUST create one `CLIENT` user and complete profile (name 2–100 characters, E.164 phone, district reference) in one persistence transaction. It MUST contain no network calls; profile failure MUST roll back the user.

#### Scenario: First creation
- GIVEN a verified new subject and valid complete profile
- WHEN onboarding succeeds
- THEN one transaction creates the `CLIENT` user and profile

#### Scenario: Profile persistence failure
- GIVEN user creation succeeds but profile creation fails in the transaction
- WHEN the transaction ends
- THEN neither record from that attempt is committed

### Requirement: Active district validation

The district MUST be checked inside the creation transaction as existing and active. Missing or inactive districts MUST return 422 `SEMANTIC_INVALID` with stable `fieldErrors.districtId`; the persistence foreign key MUST remain the final existence defense.

#### Scenario: Active district
- GIVEN `districtId` identifies an active district
- WHEN a valid onboarding is submitted
- THEN the profile uses that district reference

#### Scenario: Missing or inactive district
- GIVEN `districtId` is missing or inactive
- WHEN the profile is validated
- THEN it returns 422 with `fieldErrors.districtId` and commits nothing

### Requirement: Generic duplicate-email conflict

A different existing user with the normalized email, including a concurrent uniqueness race, MUST produce generic 409 `CONFLICT` without provider, database, identity, or persistence details.

#### Scenario: Pre-existing different user
- GIVEN another user owns the normalized email
- WHEN onboarding is invoked
- THEN it returns a generic conflict without sensitive detail

#### Scenario: Concurrent duplicate insert
- GIVEN a competing creation wins uniqueness after the pre-check
- WHEN this creation is rejected
- THEN it returns the same generic 409 conflict

### Requirement: Same-subject idempotent reconciliation

A repeated onboarding for the same verified subject MUST create no duplicates and return the existing sanitized projection with 200 semantics. Role is immutable: a mismatch returns 409 `CONFLICT` because role choice is one-time domain state.

#### Scenario: Same-subject retry
- GIVEN the verified subject already has a complete client profile
- WHEN onboarding is repeated
- THEN it returns that projection with 200 and creates no duplicates

#### Scenario: Immutable role
- GIVEN the subject is already onboarded with another role
- WHEN client onboarding is requested
- THEN it returns 409 `CONFLICT` and leaves the role unchanged

### Requirement: Sanitized projection

Responses MUST contain only opaque domain `id`, `role`, and profile `name`, `phone`, and `districtId`. They MUST NOT contain subject, credentials, tokens, or other internal identifiers. Creation returns 201; reconciliation returns 200.

#### Scenario: Safe creation response
- GIVEN a first-time onboarding completes
- WHEN the response is returned
- THEN it is 201 and contains only that projection

#### Scenario: Safe reconciliation response
- GIVEN an existing same-subject client is reconciled
- WHEN the response is returned
- THEN it is 200 and contains no sensitive identity data

### Requirement: Additive contract publication

The current-major versioned OpenAPI contract MUST publish the operation, request/response schemas, and 401, 409, 422, and 500 errors. The generated client MUST be regenerated; the addition MUST be additive.

#### Scenario: Contract refresh
- GIVEN the onboarding surface is implemented
- WHEN contract artifacts are refreshed and checked
- THEN the path, schemas, errors, and generated client surface are present

#### Scenario: Unexpected persistence error
- GIVEN an unclassified persistence failure occurs
- WHEN the endpoint responds
- THEN it returns safe 500 `INTERNAL_ERROR` without internal details

### Requirement: Deferred replaceable provider seam

The real identity-provider adapter MUST remain deferred until the platform gate and session work exist. The port MUST be replaceable; offline verification MUST use a fake provider, and this capability MUST consume no provider configuration.

#### Scenario: Offline identity seam
- GIVEN platform/session work and the real adapter are absent
- WHEN offline onboarding is verified
- THEN a fake provider supplies trusted contexts and no provider configuration is read

#### Scenario: Deferred live adapter
- GIVEN the platform gate is not satisfied
- WHEN the capability is reviewed
- THEN no live adapter or provider configuration is claimed delivered

### Requirement: Recorded offline evidence limits

Orchestration, mapping, transaction intent, and HTTP behavior MUST be verifiable offline with fake persistence and identity ports. Live provider signup/verification, database transaction/rollback/trigger/lock behavior, and end-to-end BFF flows MUST remain recorded as PENDING gates and MUST NOT be claimed satisfied.

#### Scenario: Offline verification
- GIVEN fake persistence and identity ports
- WHEN the operation is exercised
- THEN mapping, transaction intent, and HTTP behavior are verified offline

#### Scenario: Gate honesty
- GIVEN no live provider, database, or BFF environment exists
- WHEN evidence is reported
- THEN each listed live capability is marked PENDING, not proven
