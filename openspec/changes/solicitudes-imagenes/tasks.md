# Tasks: Request and Image Persistence

## Review Workload Forecast

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

| Field | Value |
|---|---|
| Estimated changed lines | 420–520 authored (schema 90–110; migration 120–150; contracts 200–260) |
| Suggested split | Review slices 1→2→3; one cohesive commit, `size-exception` if over 400 |
| Delivery strategy | ask-on-risk |

Threat-matrix propagation: secrets/literals RED before staging; commit-state RED before commit.

All checklist items are one-session tasks. Work units retain focused evidence while honoring the single cohesive unit/no-remote pattern.

| Unit | Goal | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| 1 | Schema | Prisma validate/generate | N/A — no disposable PostgreSQL | Revert schema block |
| 2 | Migration | Migration static contract | N/A — static DDL only | Remove migration directory |
| 3 | Contracts/gates | `npm test` plus quality gates | N/A — live gate pending | Revert specs and records |

## Phase 1: Schema

- [x] 1.1 Extend `apps/api/prisma/schema.prisma` with the exact normative block in `openspec/changes/solicitudes-imagenes/design.md` (read-only): `RequestStatus`, `UploadReservationStatus`, `Request`, `UploadReservation`, `RequestImage`, all mappings/constraints, and reverse relations on ClientProfile, Category, District, and User; do not alter existing physical fields.
- [x] 1.2 From `apps/api`, run `npm exec -- prisma validate` and `npm run prisma:generate`, supplying temporary `DIRECT_URL` only at invocation; persist no URL and stage no generated output.

## Phase 2: Migration

- [x] 2.1 Create `apps/api/prisma/migrations/20260901000001_requests_images/migration.sql` exactly from the normative SQL in `openspec/changes/solicitudes-imagenes/design.md` (read-only): both types, three tables, named PKs/CHECKs, six named `RESTRICT`/`CASCADE` FKs, unique object-key indexes plus `(request_id, position)`, directed request indexes, reserved-expiry partial index, exact predicates, and ZERO `INSERT`s.
- [x] 2.2 Confirm `apps/api/prisma/migrations/migration_lock.toml` (read-only) and `apps/api/prisma/migrations/` (read-only) prior history are untouched; preserve PostgreSQL history and the hand-authored migration as authoritative.

## Phase 3: Static contracts

- [x] 3.1 RED: add `STATIC` forbidden-literal scans to `apps/api/src/database/request-image-schema.spec.ts` and `apps/api/src/database/request-image-migration.spec.ts` for URLs, credentials, signed URLs, and user paths.
- [x] 3.2 Add `STATIC` schema assertions for enum members, models, nullability, snake_case mappings, bounds, defaults, relations, named uniques/indexes, and absent password-like fields in `apps/api/src/database/request-image-schema.spec.ts`.
- [x] 3.3 Add `STATIC` migration assertions for exact predicates, enum members, three tables, named indexes including the partial predicate, FK count = 6 with delete actions, and no `INSERT` in `apps/api/src/database/request-image-migration.spec.ts`.
- [x] 3.4 Run workspace `npm test`; require both contract suites green without claiming executed-SQL proof.

## Phase 4: Verification gates

- [x] 4.1 From `apps/api`, run the design command `npm exec -- prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script` with invocation-only `DIRECT_URL`, then run `npm exec -- prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`; review migration #3’s declarative portion, retain the partial index SQL, and record differences as review notes.
- [x] 4.2 RED: before staging, scan schema, migration, and both specs for URL/credential literals; fail on any secret, signed URL, bucket credential, or user path.
- [x] 4.3 Run `npm run format:check` at root and, in `apps/api`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`; do not run the live gate without disposable PostgreSQL.
- [x] 4.4 RED commit-state: explicitly stage schema, migration directory, both specs, and `openspec/changes/solicitudes-imagenes/` change artifacts ONLY; inspect staged names, exclude generated files, make ONE commit `chore: add request and image persistence`, and require a clean tree; NEVER `commit -a` or push.

## Phase 5: Records

- [x] 5.1 Create `openspec/changes/solicitudes-imagenes/apply-progress.md` with delivery/work-unit evidence, `STATIC` labels, final authored count, and live gate **UNSATISFIED / RECORDED PENDING**: migrations #1–#3 apply→re-apply→status plus seed execution; note that transitions and three-image capacity are API-owned under ADR-0015 in later items.
