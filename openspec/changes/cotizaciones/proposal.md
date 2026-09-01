# Proposal: Implement BACKLOG.md item #8: Persist quotes

## Intent
- Persist technician quotes: fixed-precision PEN money, availability, four closed states, and pairwise uniqueness.
- Deliver integrity migration #4 per TECH-DESIGN §5.1/§6.2, ADR-0015/0016/0017.

## Scope
### In Scope
- `QuoteStatus`/`Quote`, reverse relations, named checks/indexes, restrictive FKs, migration `20260901000002_quotes`.
- `STATIC` contracts, counts, Prisma validate/generate/diff, quality gates.

### Out of Scope
- Endpoints/commands, transition triggers, future-date DB checks, service creation, or seeds.

## Capabilities
### New Capabilities
- `quote-persistence`: rows and integrity rules.
### Modified Capabilities
- None. 9→10 model-count updates are compatibility work only.

## Approach
- Add `QuoteStatus { SUBMITTED, WITHDRAWN, SELECTED, CLOSED }` and `Quote`: UUID PK; required `requestId`→`requests.id` and `technicianId`→`technician_profiles.user_id` FKs (`RESTRICT`); `Decimal @db.Decimal(8,2)`; `String @db.VarChar(3)`; description `VarChar(1000)`; `DateTime` `availableAt` required `TIMESTAMPTZ(6)`; default `SUBMITTED`; `createdAt`/`updatedAt`; named `@@unique([requestId, technicianId])`; reverse relations on `Request`/`TechnicianProfile`.
- Hand-author migration #4 with `CREATE TYPE`/`CREATE TABLE quotes`, named PK, checks `quotes_amount_check` (0.01–999999.99), `quotes_currency_check` (`PEN`), `quotes_description_check` (trimmed 10–1000), named pair index, `idx_quotes_technician_created` `(technician_id ASC, created_at DESC, id ASC)`, `idx_quotes_request_created` `(request_id ASC, created_at DESC, id ASC)`, and FKs `RESTRICT` delete/`CASCADE` update. Zero `INSERT`s; no triggers.
- Add `quote-schema.spec.ts` + `quote-migration.spec.ts` with `STATIC` labels; update prior counts; run Prisma validation/generation/diff and quality gates. No dependencies.

**Pending gate:** migrations #1–#4 apply→re-apply→status plus seed execution remains `UNSATISFIED / RECORDED PENDING` until disposable PostgreSQL exists; static evidence is not live proof, and unique-index concurrency is live-only.

**Enforcement split:** enum blocks unknown states, not illegal transitions. API-owned transition legality, future-availability revalidation, and selection/cancellation effects belong to ADR-0015 work in #23/#28/#31. DB unique pair index is the race final defense and is in scope.

## Affected Areas
| Area | Impact | Description |
|---|---|---|
| `apps/api/prisma/schema.prisma` | Modified | Quote schema. |
| `apps/api/prisma/migrations/20260901000002_quotes/migration.sql` | New | Migration #4. |
| `apps/api/src/database/{quote-schema,quote-migration}.spec.ts` | New | Static contracts. |
| `apps/api/src/database/{identity-schema,request-image-schema}.spec.ts` | Modified | 9→10 counts; manifests unchanged. |

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Decimal grammar is API duty; uniqueness needs later lock+index; transitions split; availability drifts | Med | Validate inputs; ADR-0015 locks/index; revalidate #31. |
| Currency/default are implementation choices; manual SQL may diverge from diff | Med | Static contracts and Prisma diff review. |
| Offline proof and #3/#7 FK stability are limited | High | Keep gate pending; preserve history. |

## Rollback Plan
Revert the implementation commit; no local data exists to migrate or restore.

## Dependencies
- #4/#5/#7 archived; consumers: #23 and #28–#32. No external services.

## Success Criteria
- [ ] Offline `STATIC` contracts and Prisma checks prove schema, checks, indexes, FKs, and zero inserts.
- [ ] Quality gates pass.
- [ ] **NOT SATISFIED:** disposable-PostgreSQL apply→re-apply→status for #1–#4, seed execution, and concurrency proof.
