# Service-Review Persistence Specification

## Purpose

Define durable service/review integrity and evidence boundaries.

## Requirements

### Requirement: Service integrity

Services MUST store one `requestId`, one `selectedQuoteId`, required UTC `scheduledAt`, status, and UTC `createdAt`/`updatedAt`. References MUST target existing rows with restrictive deletion. Composite equality MUST be persisted when viable; otherwise later authorized selection MUST validate it.

#### Scenario: Happy
- GIVEN matching existing rows
- WHEN service persists
- THEN UTC row exists.

#### Scenario: Edge
- GIVEN missing/mismatched reference
- WHEN persistence is attempted
- THEN defense rejects it.

### Requirement: Service cardinality

Request and selected-quote references MUST each be unique; the persistence boundary MUST reject duplicates.

#### Scenario: Happy
- GIVEN unused references
- WHEN the first service persists
- THEN uniqueness holds.

#### Scenario: Edge
- GIVEN a used reference
- WHEN a duplicate persists
- THEN boundary rejects it.

### Requirement: Lifecycle states

Status MUST be exactly `SCHEDULED`, `IN_PROGRESS`, `AWAITING_CONFIRMATION`, `COMPLETED`, or `CANCELLED`; new services MUST start `SCHEDULED`. Under aggregate locking, later authorized commands MUST enforce: technician `SCHEDULED→IN_PROGRESS→AWAITING_CONFIRMATION`; client `AWAITING_CONFIRMATION→COMPLETED`; client/selected technician cancel from `SCHEDULED`/`IN_PROGRESS`; client cancels from `AWAITING_CONFIRMATION`. `COMPLETED`/`CANCELLED` are terminal; this capability stores, not adjudicates.

#### Scenario: Happy
- GIVEN a new service
- WHEN status is omitted
- THEN `SCHEDULED` persists.

#### Scenario: Edge
- GIVEN an unknown or terminal state
- WHEN a transition is requested
- THEN later command rejects it.

### Requirement: Cancellation integrity

Cancelled services MUST store UTC `cancelledAt`, an existing cancelling-user reference, and a 10–500-character reason. Non-cancelled services MUST carry none; cancellation cannot reopen.

#### Scenario: Happy
- GIVEN valid cancellation data
- WHEN cancellation persists
- THEN fields coexist.

#### Scenario: Edge
- GIVEN partial/invalid/reopened cancellation
- WHEN persistence is attempted
- THEN boundary rejects it.

### Requirement: UTC scheduling

`scheduledAt` MUST be UTC and initialized from selected-quote availability by later selection commands. Persistence MUST NOT evaluate clock-based future predicates.

#### Scenario: Happy
- GIVEN quote availability instant
- WHEN selection creates service
- THEN `scheduledAt` matches UTC.

#### Scenario: Edge
- GIVEN a nonfuture instant
- WHEN persistence receives it
- THEN selection owns futurity.

### Requirement: Review integrity

Reviews MUST store exactly one `serviceId`, one `clientId`, integer rating 1–5, optional comment physically capped at 1000 characters, and a creation instant. References MUST target existing rows; at most one review per service MUST exist, and the boundary MUST reject duplicates.

#### Scenario: Happy
- GIVEN valid service/client
- WHEN rating-4 review persists
- THEN bounded row exists.

#### Scenario: Edge
- GIVEN invalid or duplicate review
- WHEN persistence is attempted
- THEN boundary rejects it.

### Requirement: Review immutability

Persisted reviews MUST be immutable: the boundary MUST reject modification/removal. Reviews MUST have creation time only, no update tracking; later authorized commands own eligibility.

#### Scenario: Happy
- GIVEN a new valid review
- WHEN it persists
- THEN creation time only exists.

#### Scenario: Edge
- GIVEN an existing review
- WHEN update/delete is attempted
- THEN boundary rejects it.

### Requirement: Technician resolution

Services/reviews MUST NOT duplicate technician identity or reputation averages. Both MUST resolve through service → selected quote → technician.

#### Scenario: Happy
- GIVEN selected quote relation
- WHEN technician is read
- THEN relation resolves it.

#### Scenario: Edge
- GIVEN direct technician/average field
- WHEN contract is checked
- THEN stored value is rejected.

### Requirement: Migration contract

Migration #5, `20260901000003_services_reviews`, MUST preserve migrations #1–#4 and the provider lock. Every key, unique, check, index, FK, and immutability rule MUST be named:

| Class | Required names |
|---|---|
| Keys/uniques | `services_pkey`, `reviews_pkey`, `services_request_id_key`, `services_selected_quote_id_key`, `reviews_service_id_key`, composite `quotes_id_request_id_key` when used |
| Checks/index | `services_cancellation`, `services_cancellation_reason`, `reviews_rating`, `idx_services_status_created` |
| FKs/rule | Named restrictive FKs; `reviews_immutable` rejecting update/delete |

#### Scenario: Happy
- GIVEN four migration versions
- WHEN the fifth is inspected
- THEN names/history/no inserts hold.

#### Scenario: Edge
- GIVEN no disposable PostgreSQL
- WHEN status is reported
- THEN live gates stay RECORDED PENDING.

### Requirement: Offline evidence

Static contracts MUST assert models, enum members, mappings, uniqueness, bounds, named checks, immutability presence, FK delete actions, and no seed rows. Evidence MUST say `STATIC` and MUST NOT claim SQL, trigger, or concurrency proof.

#### Scenario: Happy
- GIVEN source text only
- WHEN static checks pass
- THEN invariants are `STATIC`.

#### Scenario: Edge
- GIVEN no live execution
- WHEN evidence is reported
- THEN no live proof is claimed.
