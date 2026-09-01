# Proposal: Persist Services and Reviews

## Intent
Persist `Service` (1:1 with request and selected quote) through five states with phase-dependent cancellation, and immutable `Review` (1:1 with service, integer rating 1–5), as migration #5 with database integrity per TECH-DESIGN §5/§6.3 and ADR-0002/0013/0014/0015/0017.

## Scope
### In Scope
- Persistence only: Prisma enum/models, normalized relations, restrictive integrity, migration #5, static contracts, count updates, and quality gates.
### Out of Scope
- Commands/endpoints (#31/#33–#39), transition triggers, auth/authorization, OpenAPI/UI, contact projection, reputation logic, stored averages, seeds, events/audit history, and new dependencies.

## Capabilities
### New Capabilities
- `service-review-persistence`: durable services, cancellation integrity, and immutable reviews.
### Modified Capabilities
- None.

## Approach
- Add `ServiceStatus {SCHEDULED, IN_PROGRESS, AWAITING_CONFIRMATION, COMPLETED, CANCELLED}` and `Service`: UUID PK; unique `requestId` → `requests.id` RESTRICT; unique `selectedQuoteId`; required `scheduledAt` `TIMESTAMPTZ(6)`; default `SCHEDULED`; cancellation trio with restrictive `users.id` FK; `createdAt`/`updatedAt`. This pair is the recorded interpretation of transition timestamps.
- Preserve the API-owned matrix: `SCHEDULED`→`IN_PROGRESS` (technician); `SCHEDULED`/`IN_PROGRESS`→`CANCELLED` (client or selected technician); `IN_PROGRESS`→`AWAITING_CONFIRMATION` (technician); awaiting→`COMPLETED`/`CANCELLED` (client). `COMPLETED`/`CANCELLED` are terminal; only `COMPLETED` admits reviews.
- Prefer composite FK `(selected_quote_id, request_id)` → `quotes(id, request_id)`, adding `quotes_id_request_id_key` in migration #5, never rewriting #4, if Prisma validate/diff is clean. Otherwise document independent restrictive FKs and #31’s transactional equality check.
- Add `Review`: UUID PK; unique `serviceId` → `services.id` RESTRICT; `clientId` → `users.id` RESTRICT; integer `rating` CHECK 1–5; nullable `VARCHAR(1000)` `comment`; `createdAt` only, no `updatedAt`. Hand-authored `CREATE TYPE`/tables include `idx_services_status_created (status, created_at DESC, id)`, `services_cancellation` (trio all-or-nothing and required iff `CANCELLED`), `services_cancellation_reason` (trimmed 10–500), `reviews_rating`, RESTRICT/CASCADE-update FKs, and an immutability function/trigger rejecting UPDATE/DELETE. ZERO INSERTs.
- Add `service-review-schema.spec.ts` and `service-review-migration.spec.ts` (`STATIC`); update three prior model counts 10→12; review Prisma validate/generate/diff and quality gates.

### Enforcement Split
The enum blocks unknown states, not illegal transitions. Actor/phase rules, completion eligibility, cancellation authorization, review eligibility (#38), and selection transaction (#31) are API-owned under ADR-0015; DB defenses are uniques, composite FK if viable, immutability trigger, rating, and cancellation checks.

## Affected Areas
| Area | Impact |
|---|---|
| `apps/api/prisma/schema.prisma` | Models, enum, relations |
| `apps/api/prisma/migrations/20260901000003_services_reviews/migration.sql` | Hand-authored migration #5 |
| `apps/api/src/database/service-review-schema.spec.ts` + `service-review-migration.spec.ts` | STATIC contracts |
| `apps/api/src/database/identity-schema.spec.ts`, `request-image-schema.spec.ts`, `quote-schema.spec.ts` | Counts 10→12 |
| Prior migrations, lock, seeds, generated output, manifests | Unchanged |

## Risks
| Risk | Mitigation |
|---|---|
| Trigger offline proof; state split | Pending live gate; API owns transitions |
| Composite FK Prisma/SQL alignment | Validate/diff; document fallback |
| Review owner mismatch; race | #38 resolves owner; unique index plus later lock |
| Normalized read cost for #39 | Preserve join indexes; no technician duplicate |
| Timestamp interpretation; FK stability | Record pair; preserve parents |
| Offline limits | Label evidence STATIC only |

## Rollback Plan
Revert the single commit; no local data is created.

## Dependencies
- #4/#8 archived; #31 and #33–#39 are later consumers; no external services.

## Success Criteria
- [ ] Offline contracts, named constraints/relations/indexes/trigger, zero inserts, and Prisma validate/generate/diff review are verifiable.
- [ ] Live gate is **ALL UNSATISFIED** until disposable PostgreSQL proves migrations #1–#5 apply→re-apply→status, seed execution, and trigger/concurrency behavior; static evidence is not live proof.
