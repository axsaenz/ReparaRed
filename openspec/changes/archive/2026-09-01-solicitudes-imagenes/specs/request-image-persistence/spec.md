# Request Image Persistence Specification

## Purpose

Define durable request, reservation, and confirmed-image records; later capabilities own authorization, validation, transitions, cleanup, and capacity.

## Requirements

### Requirement: Request fields
Persistence MUST store owner-client, active-category, and district references; title, description, preferred instant, status, and UTC timestamps. Title MUST be 5–120 non-blank characters; description MUST be 20–2000. References MUST be existing and restrictive.

#### Scenario: Happy
- GIVEN valid refs
- WHEN bounded UTC data submits
- THEN persists.

#### Scenario: Edge
- GIVEN missing reference or invalid text
- WHEN written
- THEN reject.

### Requirement: Lifecycle states
Status MUST be `DRAFT`, `PUBLISHED`, `ASSIGNED`, or `CANCELLED`; `ASSIGNED` and `CANCELLED` MUST be terminal. Later authorized commands MUST record publication instant exactly at `PUBLISHED`, retain it, and satisfy same-row consistency. This capability MUST NOT decide transitions or preconditions.

#### Scenario: Happy
- GIVEN draft reaches `PUBLISHED` at instant T
- WHEN later `ASSIGNED`
- THEN stored publication instant is T and unchanged.

#### Scenario: Edge
- GIVEN unknown status or timestamp mismatch
- WHEN persisted
- THEN reject.

### Requirement: Cancellation fields
`CANCELLED` MUST have cancellation instant, existing cancelling-user reference, and reason 10–500 characters. Other states MUST have none.

#### Scenario: Happy
- GIVEN valid user and reason
- WHEN `CANCELLED`
- THEN fields persist.

#### Scenario: Edge
- GIVEN incomplete fields or another state
- WHEN persisted
- THEN consistency rejects.

### Requirement: Upload reservations
Each reservation MUST store one request reference, stable unique object key, positive declared byte size, declared content type, status `RESERVED` or `CONFIRMED` (recorded implementation choice), expiry instant, and optional `confirmedAt` instant. `confirmedAt` MUST exist exactly for `CONFIRMED`; expiry signals cleanup, not a durable `EXPIRED` state.

#### Scenario: Happy
- GIVEN valid reservation
- WHEN `CONFIRMED` has `confirmedAt`
- THEN persists.

#### Scenario: Edge
- GIVEN expired `RESERVED` data or mismatch
- WHEN inspected or written
- THEN expiry guides cleanup; invalid data rejects.

### Requirement: Confirmed images
Each image MUST store a request reference, stable unique object key, verified MIME in `{image/jpeg, image/png, image/webp}`, verified byte size ≤5,242,880, and request-unique ordinal. Its row means later validation confirmed the object.

#### Scenario: Happy
- GIVEN validated object
- WHEN valid metadata and ordinal persist
- THEN image persists.

#### Scenario: Edge
- GIVEN bad type, size, key, or ordinal
- WHEN persisted
- THEN reject.

### Requirement: Server-owned keys
Later flows MUST generate stable random keys server-side. Persistence MUST NOT store signed URLs, bucket credentials, or user paths. Keys MUST be unique within each table; no cross-table registry.

#### Scenario: Happy
- GIVEN server-generated key
- WHEN a child persists
- THEN permitted metadata stores.

#### Scenario: Edge
- GIVEN signed URL, credential, or user path
- WHEN supplied as key
- THEN reject.

### Requirement: Split capacity
Later authorized commands MUST, under aggregate locking, cap published requests at three images, counting active reservations and confirmed images. This capability MUST NOT use a cross-row constraint.

#### Scenario: Happy
- GIVEN three active reservations/images
- WHEN locked command adds one
- THEN command rejects it.

#### Scenario: Edge
- GIVEN standalone children
- WHEN constraints inspected
- THEN no row counts them.

### Requirement: Restrictive deletion
Foreign keys MUST be restrictive. Only later explicit ordered cleanup MAY remove temporary abandoned-draft children. This capability MUST NOT physically remove published, assigned, or cancelled requests.

#### Scenario: Happy
- GIVEN abandoned draft with temporary children
- WHEN ordered cleanup removes children first
- THEN draft removal is permitted.

#### Scenario: Edge
- GIVEN protected request
- WHEN physical deletion is attempted
- THEN restrictive integrity prevents it.

### Requirement: Versioned migration
Migration three MUST add this schema over existing history and name primary keys, uniques, checks, indexes, and foreign keys. A partial `expiresAt` index for `RESERVED` and same-row rules the modeling tool cannot express MUST be explicit database rules. Live apply→re-apply→status MUST remain RECORDED PENDING until disposable PostgreSQL exists.

#### Scenario: Happy
- GIVEN existing migration history
- WHEN migration three is inspected
- THEN named constructs exist.

#### Scenario: Edge
- GIVEN no disposable PostgreSQL
- WHEN acceptance is reported
- THEN sequence remains RECORDED PENDING.

### Requirement: Offline evidence
Static assertions MUST verify models, enum members, mappings, bounds, named checks, unique/index declarations, restrictive FK delete actions, and no seed rows. Evidence MUST say `STATIC` and MUST NOT claim executed-SQL proof.

#### Scenario: Happy
- GIVEN no live database
- WHEN contracts are inspected
- THEN invariants report `STATIC`.

#### Scenario: Edge
- GIVEN static assertions pass
- WHEN verification is reported
- THEN pending gate remains explicit.
