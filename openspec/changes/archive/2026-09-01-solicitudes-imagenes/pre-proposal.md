# Pre-Proposal State — gentle-ai.sdd-preproposal/v1

- revision: 1
- status: confirmed
- exploration: `openspec/changes/solicitudes-imagenes/exploration.md`
- research: unselected
- proposal_ready: true
- confirmed_by: orchestrator (auto mode mandate 2026-09-01 — recommended options auto-selected)

## Confirmed product decisions

| # | Decision | Confirmed value |
|---|----------|-----------------|
| 1 | reservation_states | `reserved-confirmed-enum` — Prisma enum `UploadReservationStatus { RESERVED, CONFIRMED }`; RECORDED as implementation choice (sources require a status but never enumerate it); expiry = `expiresAt` + physical cleanup (#21), no durable EXPIRED state |
| 2 | image_state | `row-existence-means-confirmed` — NO ImageStatus column; request_images rows are created only after validation (#20); no ORPHAN rows |
| 3 | reservation_identifier | `uuid-pk-only` — opaque UUID id; no separate token column; signed URLs never persisted |
| 4 | object_key_storage | `single-objectkey-per-table` — one stable random `objectKey` column per table with named unique constraints; bucket is infra config; cross-table global registry rejected (scope expansion) |
| 5 | metadata_scope | `locked-fields-only` — reservations: declared size/type; images: verified mimeType/byteSize + position; no filename/checksum/dimensions |
| 6 | metadata_constraints | `db-named-checks` — positive declared sizes, byteSize <= 5242880, MIME in {image/jpeg,image/png,image/webp}; real content/bytes verification belongs to #20 |
| 7 | three_image_limit | `api-transaction-under-lock` — active reservations + confirmed images counted under request-row lock per ADR-0015 in LATER items; no row CHECK or trigger claims cross-row counting in #7 |
| 8 | transition_enforcement | `enum-plus-samerow-checks-now` — RequestStatus enum + same-row metadata/timestamp consistency checks in #7; legal transition matrix enforced by later API commands under lock; no transition triggers in #7 |
| 9 | request_indexes | `targeted-composites` — (status, category_id, published_at, id) and (client_id, published_at, id); directions/names frozen in design; no speculative indexes |
| 10 | reservation_indexes | `request-status-plus-partial-expiry` — (request_id, status) + partial index on expires_at WHERE status='RESERVED' (explicit SQL if Prisma can't express) |
| 11 | delete_behavior | `restrict-everywhere` — restrictive FKs; cleanup/discard deletes temporary children explicitly before abandoned drafts; no deletedAt; published/assigned/cancelled records never cascade-deleted |
| 12 | cancellation_actor_fk | `users-id-restrict` — cancelledByUserId FK → users.id restrictive; role/ownership validation is later API territory |
| 13 | reservation_timestamps | `minimal-locked` — expiresAt + nullable confirmedAt per locked entity row; requests/images keep standard createdAt/updatedAt TIMESTAMPTZ(6) |

## Locked model content (binding, verbatim from TECH-DESIGN §5.1/§5.2/§6.1/§9 + ADRs)

- `requests`: id, clientId, categoryId, districtId, title (5–120), description (20–2000), preferredAt, status, publishedAt, cancellation fields (cancelledAt, cancelledByUserId, cancellationReason 10–500), timestamps; states DRAFT|PUBLISHED|ASSIGNED|CANCELLED; ASSIGNED+CANCELLED terminal; transitions per §6.1 matrix (API-owned later).
- `upload_reservations`: id, requestId, objectKey (unique), declared size/type, status, expiresAt, confirmedAt; draft-owner-only usage, expires and is cleaned (#21).
- `request_images`: id, requestId, objectKey (unique), mimeType, byteSize (max 5 MiB = 5242880), position (unique per request), timestamps; 1–3 confirmed at publish time (publication rule, later item).
- Relations: client_profiles 1—* requests *—1 categories; requests *—1 districts; requests 1—* request_images; requests 1—* upload_reservations.
- Storage boundary: Supabase Storage owns objects; DB stores only stable keys + metadata, never signed URLs (ADR-0006). Race control via short transactions + pessimistic row locks (ADR-0015). DRAFT internal state included (ADR-0019). Timestamps TIMESTAMPTZ UTC (ADR-0017). Explicit SQL when Prisma can't express (ADR-0007).
- Recorded discrepancy: PRD says "up to three" images vs approved TECH-DESIGN/ADR-0019 "1–3 confirmed to publish" — follow the approved design; note it, don't silently change it.

## Capability impact (binding)

NEW capability `request-image-persistence` (models, constraints, migration #3, offline contracts). No modifications to existing capabilities.

## Scope boundary (binding)

IN: Request/UploadReservation/RequestImage models + RequestStatus/UploadReservationStatus enums, named checks/uniques/FKs/indexes, migration #3, offline static schema/migration contract tests, quality gates. OUT: all endpoint/job behavior (#17/#19/#20/#21/#22+), Storage infra/signed URLs (#11), quotes (#8), services/reviews (#9), OpenAPI (#10), auth, catalog changes, soft-delete/audit, transition triggers, cross-row count enforcement.

## Carried forward (binding)

Live PostgreSQL gate remains UNSATISFIED (migrations #1–#3 apply→re-apply→status + seed execution). Offline evidence only; MUST NOT claim live acceptance.
