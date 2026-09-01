# Pre-Proposal State — gentle-ai.sdd-preproposal/v1

- revision: 1
- status: confirmed
- exploration: `openspec/changes/servicios-resenas/exploration.md`
- research: unselected
- proposal_ready: true
- confirmed_by: orchestrator (auto mode mandate 2026-09-01 — recommended options auto-selected)

## Confirmed product decisions

| # | Decision | Confirmed value |
|---|----------|-----------------|
| 1 | service_status | `service-status-enum` — Prisma enum ServiceStatus {SCHEDULED, IN_PROGRESS, AWAITING_CONFIRMATION, COMPLETED, CANCELLED} (locked members); NO transition triggers; matrix API-owned under ADR-0015 (#34–#37) |
| 2 | initial_service_status | `scheduled-default` — DB default SCHEDULED; #31 also sets it explicitly in the selection transaction (recorded implementation choice) |
| 3 | same_request_integrity | `composite-fk-preferred` — add unique target quotes(id, request_id) and service composite FK (selected_quote_id, request_id) → quotes(id, request_id) IF prisma validate + migration diff support it cleanly; FALLBACK: independent restrictive FKs + #31 in-transaction equality check as authoritative rule (document which path was taken) |
| 4 | transition_timestamps | `created-updated-only` — interpret "timestamps de transición" as the established createdAt/updatedAt pair; do NOT invent startedAt/confirmedAt columns; per-transition audit would need a separate decision (interpretation recorded) |
| 5 | review_immutability | `db-trigger-no-updatedat` — PostgreSQL trigger rejecting UPDATE and DELETE on reviews + Review has createdAt ONLY (no updatedAt, no mutation path); follows identity role-immutability trigger precedent; #38 still owns authorization/completion/lock/insert-conflict |
| 6 | review_technician_binding | `resolve-via-quote` — NO direct technicianId on Service or Review (locked §5.1 rows); technician resolved via service → selected quote; reputation derives via join, never stored average |
| 7 | review_comment | `nullable-varchar1000` — optional comment String? @db.VarChar(1000), no invented minimum/whitespace bound; #38 may normalize blank |
| 8 | participant_indexes | `normalized-joins` — services: unique request_id, unique selected_quote_id, idx_services_status_created (status, created_at DESC, id); reviews: unique service_id; leverage existing quote technician-leading index; NO service-technician index |
| 9 | migration_naming | `20260901000003_services_reviews` — append migration #5; preserve #1–#4 + provider lock |

## Locked model content (binding, verbatim from TECH-DESIGN §5.1/§5.2/§5.3/§6.3 + ADR-0002/0013/0014/0015/0017)

- `services`: id, requestId, selectedQuoteId, scheduledAt, status, cancellation (cancelledAt, cancelledByUserId, cancellationReason 10–500), transition timestamps; ÚNICOS request + selected quote; índices por estado y creación; technician resolved via selected quote.
- `reviews`: id, serviceId, clientId, rating, comment, createdAt; UNA por servicio; rating entero 1–5; comentario opcional máx 1000; INMUTABLE.
- Relations: requests 1—0..1 services —1 quotes(selectedQuoteId); services 1—0..1 reviews.
- Service matrix (§6.3): SCHEDULED→IN_PROGRESS (tech), SCHEDULED/IN_PROGRESS→CANCELLED (client or tech), IN_PROGRESS→AWAITING_CONFIRMATION (tech), AWAITING_CONFIRMATION→COMPLETED (client confirm) or →CANCELLED (client only). COMPLETED+CANCELLED terminal; only COMPLETED admits review.
- Cancellation: terminal, phase-dependent (ADR-0014); requires non-empty reason + actor + date; explicit API command with authorization + concurrency control.
- Selection (#31, later): locks request, validates ownership/state/quote-belongs-to-request/future availability, marks SELECTED, closes competitors, request→ASSIGNED, creates service; quote.availableAt initializes service.scheduledAt (ADR-0017).
- Review creation (#38, later): transaction checks completed service + relies on unique-per-service constraint (ADR-0015).
- Same-request invariant: validated in transaction + SQL restriction when feasible (TD §5.3). Critical constraints also in PostgreSQL (ADR-0007).

## Capability impact (binding)

NEW capability `service-review-persistence`. No capability modifications. Expected side effect: model-count assertions in identity/request-image/quote static specs update 10→12; composite FK (if viable) adds a unique target to quotes via migration #5 (no rewrite of migration #4).

## Scope boundary (binding)

IN: Service + Review models + ServiceStatus enum, uniqueness structures, cancellation + rating named checks, composite-or-independent FK integrity, indexes, migration #5, offline static contracts, count updates, quality gates. OUT: commands/endpoints (#31/#33–#39), transition triggers, reputation calculation, contact projection, auth, OpenAPI, seeds, event/audit history, stored averages.

## Carried forward (binding)

Live PostgreSQL gate remains UNSATISFIED (migrations #1–#5 apply→re-apply→status + seed execution + concurrency/trigger behavior). Offline evidence only; MUST NOT claim live acceptance. Enforcement split: service transitions/actors + review eligibility are API-owned under ADR-0015.
