# quote-persistence Specification

## Purpose

Define durable quote rows and declarative integrity/read guarantees. Authorized commands own transition legality and future-availability checks.

## Requirements

### Requirement: Complete quote aggregate

The system MUST persist one request reference, technician-profile reference, amount, currency, description, availability instant, status, and UTC creation/update instants. Both references MUST resolve to existing rows restrictively; technician binding MUST target the profile, not the raw identity.

#### Scenario: Persist complete quote
- GIVEN existing request/profile rows and valid quote data
- WHEN persistence accepts the quote
- THEN one row contains every required field and both references

#### Scenario: Reject missing parent
- GIVEN either referenced row is absent
- WHEN persistence attempts the write
- THEN it rejects the write without creating a quote row

### Requirement: Fixed PEN money

Amount MUST use fixed-precision decimal with two places, bounded 0.01–999,999.99, and MUST NOT use floating-point representation anywhere in the persistence path. Currency MUST be ISO code PEN at the persistence boundary; other currencies require an explicit later decision.

#### Scenario: Store valid money
- GIVEN amount 0.01 and currency PEN
- WHEN persistence stores the quote
- THEN the bounded two-place decimal value is preserved

#### Scenario: Reject invalid money
- GIVEN zero, out-of-range, excess-scale, floating-point, or non-PEN input
- WHEN the persistence boundary validates it
- THEN it rejects the write without rounding or changing currency

### Requirement: Bounded meaningful description

Descriptions MUST contain 10–1000 meaningful characters, reject blank or whitespace-only input, and have a physical upper bound of 1000 characters.

#### Scenario: Store bounded description
- GIVEN a description with 10 meaningful characters
- WHEN persistence stores the quote
- THEN the description is accepted

#### Scenario: Reject invalid description
- GIVEN blank, whitespace-only, fewer-than-10, or over-1000-character text
- WHEN persistence validates it
- THEN it rejects the write

### Requirement: Closed quote lifecycle

Status MUST belong to {SUBMITTED, WITHDRAWN, SELECTED, CLOSED}. New quotes MUST start SUBMITTED; SELECTED and CLOSED MUST be terminal. Later authorized commands MUST enforce published-request edit/resubmit, selection, and closure by selection or cancellation under aggregate locking; persistence MUST NOT adjudicate transitions.

#### Scenario: Initialize submitted status
- GIVEN a new quote without an explicit lifecycle override
- WHEN persistence creates it
- THEN its status is SUBMITTED

#### Scenario: Reject unknown or unevaluated transition
- GIVEN an unknown status or a requested transition among known statuses
- WHEN persistence-only handling receives it
- THEN unknown status is rejected and transition legality remains a later locked-command obligation

### Requirement: Unique quote pair

At most one quote per (request, technician) pair MUST exist. The persistence boundary MUST reject duplicate inserts as the final race defense; resend/edit MUST update the existing identity and pair, not insert another row.

#### Scenario: Update on resend
- GIVEN an existing pair and changed quote values
- WHEN resend/edit is persisted
- THEN the same row and pair remain and updated time changes

#### Scenario: Reject duplicate pair
- GIVEN a quote already exists for the pair
- WHEN another insert for that pair is attempted
- THEN the persistence boundary rejects it

### Requirement: UTC availability instant

Each quote MUST persist one required availability instant normalized to UTC. Future-only validity belongs to later creation and selection revalidation; persistence MUST NOT evaluate clock-based predicates.

#### Scenario: Persist availability
- GIVEN a valid availability instant with a timezone offset
- WHEN persistence stores the quote
- THEN one required UTC instant is retained

#### Scenario: Do not enforce future time
- GIVEN all other data is valid and availability is already past
- WHEN persistence stores the quote
- THEN it does not apply a clock predicate; later commands revalidate it

### Requirement: Deterministic quote reads

Persistence MUST provide deterministic technician-owned and per-request quote access structures, ordered newest-first by creation time with ascending identifier tie-breaking.

#### Scenario: Read both ordered lists
- GIVEN quotes for one technician and one request
- WHEN either list path reads them
- THEN results follow creation order with the stated stable tie-break

#### Scenario: Resolve equal timestamps
- GIVEN quotes sharing a creation instant
- WHEN either list path reads them
- THEN identifier order is stable and repeatable

### Requirement: Restrictive referential deletion

Quote foreign keys MUST be restrictive and MUST NOT cascade business deletion. Quote rows tied to business requests or technicians MUST NOT be physically removable through this capability except under later explicit ordered cleanup rules.

#### Scenario: Preserve linked quote
- GIVEN a quote with retained request and profile parents
- WHEN persistence maintains the aggregate
- THEN both links remain intact without cascade behavior

#### Scenario: Reject parent deletion
- GIVEN a linked request or profile has dependent quotes
- WHEN its deletion is attempted
- THEN deletion is rejected and quote rows remain

### Requirement: Fourth migration contract

The quote schema MUST be the fourth versioned migration after the existing history, named `20260901000002_quotes`. It MUST name its key, pair unique, checks, read indexes, and restrictive foreign keys. Live apply→re-apply→status remains RECORDED PENDING until a disposable PostgreSQL instance exists.

#### Scenario: Identify migration four
- GIVEN the existing three-migration history
- WHEN the quote schema is inspected
- THEN it is migration four with all named integrity objects

#### Scenario: Preserve pending live gate
- GIVEN no disposable PostgreSQL instance exists
- WHEN apply→re-apply→status is assessed
- THEN the gate remains UNSATISFIED / RECORDED PENDING

### Requirement: Static persistence contracts

Offline static contracts MUST verify the model, enum members, decimal mapping, bounds, named checks, uniques/indexes, FK delete actions, and absence of seed rows. Evidence MUST be labeled STATIC and MUST NOT claim executed-SQL or concurrency proof.

#### Scenario: Verify offline invariants
- GIVEN repository files without a live database
- WHEN static contract assertions run
- THEN the listed invariants and zero-seed condition are verifiable

#### Scenario: Limit static evidence
- GIVEN static assertions pass
- WHEN evidence is reported
- THEN it is labeled STATIC, not SQL-execution or concurrency evidence
