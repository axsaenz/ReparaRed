# Proposal: Implement BACKLOG.md item #7: Persist requests and images

## Intent

Persist the request aggregate—requests, expiring upload reservations, and confirmed images—as migration #3, with database-level same-row integrity. The design follows TECH-DESIGN §5/§6.1/§9 and ADR-0002/0006/0007/0015/0017/0019.

## Scope

### In Scope
- Prisma models, enums, relations, mapped snake_case names, named checks, uniques, indexes, and restrictive foreign keys.
- Hand-authored migration #3 in the established Prisma-shape DDL plus explicit-SQL style; zero rows and no new dependencies.
- Offline schema/migration contract tests and quality gates.

### Out of Scope
- Persistence only: no endpoints, Storage calls, signed URLs, transition triggers, cross-row count enforcement, soft delete, or catalog changes.
- API ownership/authorization, legal transitions, upload confirmation, cleanup, publication behavior, and image-content verification remain later work.

## Capabilities

### New Capabilities
- `request-image-persistence`: durable request lifecycle, upload reservations, and confirmed-image metadata.

### Modified Capabilities
- None.

## Approach

- Extend `schema.prisma` with `RequestStatus { DRAFT, PUBLISHED, ASSIGNED, CANCELLED }` and `UploadReservationStatus { RESERVED, CONFIRMED }` (the latter is a recorded implementation choice), plus UUID-keyed `Request`, `UploadReservation`, and `RequestImage` models. Requests hold client/category/district FKs, title 5–120, description 20–2000, `preferredAt`, nullable `publishedAt`, and nullable cancellation trio (`cancelledAt`, `cancelledByUserId` → `users.id`, reason 10–500). Reservations hold restrictive `requestId`, unique `objectKey`, declared size/type, status, `expiresAt`, and nullable `confirmedAt`. Images hold restrictive `requestId`, unique `objectKey`, checked MIME (`image/jpeg|image/png|image/webp`), `byteSize <= 5242880`, position, timestamps, and unique `(requestId, position)`.
- Use UTC `TIMESTAMPTZ(6)`, named same-row checks (or explicit SQL) for state/timestamp consistency—`publishedAt` only for `PUBLISHED`/`ASSIGNED`, cancellation fields only for `CANCELLED`—and `RESTRICT` everywhere. Add targeted indexes: `(status, category_id, published_at, id)`, `(client_id, published_at, id)`, reservations `(request_id, status)`, partial `expires_at WHERE status = 'RESERVED'` when Prisma needs explicit SQL, and images `(request_id)` via FK/position indexes.
- Verify with `prisma validate`/`generate`, declarative-versus-migration diff review, and `STATIC` contract tests for models, enums, mappings, checks, indexes, FK actions, and absence of `INSERT`; run configured quality gates.
- Enum values prevent unknown states, not illegal transitions. The locked transition matrix and 1–3 confirmed-image capacity are API-owned under request-row locks in later #17/#19/#22; #7 documents this split. The approved design’s 1–3-at-publish rule supersedes the PRD’s “up to three” wording.
- The live gate for migrations #1–#3 apply→re-apply→status plus seed execution is **ALL UNSATISFIED** until disposable PostgreSQL exists; evidence here is static only.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/prisma/schema.prisma` | Modified | Three models, enums, relations, mappings, and declarative constraints. |
| `apps/api/prisma/migrations/<ts>_requests_images/migration.sql` | New | Migration #3 with explicit additions and no rows. |
| `apps/api/src/database/request-image-schema.spec.ts`; `request-image-migration.spec.ts` | New | Static schema and migration contracts. |
| Manifests and `migration_lock.toml` | Unchanged | Verify only; PostgreSQL provider remains locked. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Reservation states were unenumerated; cross-row races remain API-owned. | Med | Record the enum choice; require later locked transactions. |
| Storage/DB non-atomicity and draft deletion ordering. | Med | Preserve stable keys/expiry for #21 cleanup; use explicit restrictive cleanup. |
| Manual SQL diverges from Prisma; offline checks cannot prove execution. | Med | Review diff and label all evidence `STATIC`; retain pending live gate. |
| FK targets from #5/#6 drift. | Low | Do not rename or recreate existing tables. |

## Rollback Plan

Revert the single implementation commit to remove the models, migration #3, and tests. No local data exists, so rollback requires no data migration.

## Dependencies

- #4/#5/#6 archived; later consumers are #17/#19/#20/#21/#22. No external services.

## Success Criteria

- [ ] Schema and migration contracts pass offline with all locked fields, constraints, mappings, indexes, FK actions, and zero inserts.
- [ ] Prisma validation/generation, diff review, and quality gates pass without manifest changes.
- [ ] Live migration/seed acceptance remains explicitly **NOT SATISFIED** pending disposable PostgreSQL.
