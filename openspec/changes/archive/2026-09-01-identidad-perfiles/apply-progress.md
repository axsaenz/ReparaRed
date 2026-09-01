# Apply Progress: Identity and Profile Persistence

## Delivery Resolution

- Forecast: `Decision needed before apply: Yes`; risk `Medium`; estimate `380–450` authored lines.
- Resolution: `SINGLE COHESIVE UNIT, PROCEED`; no chaining because no Git remote exists.
- Strategy: one exact commit, `chore: add identity and profile persistence`.
- Review budget: the 400-line budget constrains slicing, not implementation content. The final authored count is reported honestly; no content was compressed or removed.

## Implementation Progress

### Completed Tasks

- [x] 1.1 Schema model block added exactly from `design.md`.
- [x] 1.2 Temporary invocation-only `DIRECT_URL` validation and generation succeeded.
- [x] 2.1 Hand-authored migration #2 added exactly from `design.md`.
- [x] 2.2 PostgreSQL lock and empty baseline verified unchanged.
- [x] 3.1 Static schema contract test added, including optional DMMF coverage.
- [x] 3.2 Static migration contract test added and workspace tests passed.
- [x] 4.1 Declarative Prisma migration diff reviewed against migration #2.
- [x] 4.2 Quality gates passed.
- [x] 4.3 Static-secret RED gate passed before staging.
- [x] 4.4 Commit-state RED passed; exact single commit created and tree verified clean.
- [x] 5.1 This apply-progress record created with cumulative evidence.

### Files Changed

| File | Action | What Was Done |
|---|---|---|
| `apps/api/prisma/schema.prisma` | Modified | Added `UserRole`, six mapped models, relations, unique constraints, bounds, and profile optionals. |
| `apps/api/prisma/migrations/20260901000000_identity_profiles/migration.sql` | Created | Added migration #2 DDL, named constraints/indexes, restrictive foreign keys, checks, and role/profile triggers. |
| `apps/api/src/database/identity-schema.spec.ts` | Created | Added STATIC schema, mapping, relation, bound, uniqueness, exclusion, and optional DMMF assertions. |
| `apps/api/src/database/identity-migration.spec.ts` | Created | Added STATIC migration checks for tables, named constructs, predicates, delete/update actions, triggers, and zero seed inserts. |
| `openspec/changes/identidad-perfiles/tasks.md` | Modified | Marked all 11 assigned tasks complete. |
| `openspec/changes/identidad-perfiles/apply-progress.md` | Created | Recorded this cumulative apply evidence and pending live-gate statements. |

## Work Unit Evidence

| Phase | Focused test command and exact result | Runtime harness command/scenario and exact result | Rollback boundary |
|---|---|---|---|
| 1. Schema | `npm exec --workspace=@repara/api -- prisma validate --schema prisma/schema.prisma` and `prisma generate --schema prisma/schema.prisma`: both exited 0; Prisma 6.19.3 accepted the schema and generated the client. | STATIC/offline Prisma CLI checks only; no database connection was required, and generated output remained ignored. | Revert the schema model block and regenerate the ignored client. |
| 2. Migration | `npm exec --workspace=@repara/api -- vitest run src/database/identity-schema.spec.ts src/database/identity-migration.spec.ts`: 2 files passed, 11 tests passed. Lockfile and baseline remained unchanged. | N/A for executed SQL: no live PostgreSQL exists. The hand-written SQL checks and triggers are executable only by live PostgreSQL. | Remove `20260901000000_identity_profiles/migration.sql`; baseline and provider lock remain intact. |
| 3. Static contracts | `npm test`: web 1 file/1 test passed; API 11 files/65 tests passed. | STATIC offline contract harness passed; no live runtime or database boundary exists for the hand-written SQL. | Revert both new contract spec files. |
| 4. Verification | `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, and `npm run build`: each exited 0. | Prisma `migrate diff` exited 0 with temporary invocation-only `DIRECT_URL`; no migration was applied. | Revert the cohesive code, migration, tests, and records commit. |
| 5. Records | Re-read `tasks.md`: all 11 tasks are `[x]`; record is included in the single commit. | STATIC record only; live apply/re-apply/status is intentionally not claimed. | Revert `apply-progress.md` and task checkbox changes with the same commit. |

## RED and STATIC Evidence

- STATIC schema gate: schema text contains no password, secret, or credential column names.
- STATIC literal gate: the schema, migration, and two new tests contain no `postgres://` or `postgresql://` URL literals and no credential literals.
- STATIC migration gate: exact name/phone/description/years predicates, five restrictive foreign-key actions, all named indexes/keys, all three functions, all three triggers, and zero `INSERT INTO` statements are asserted.
- Commit-state RED: only the intended schema, migration directory, two new tests, and `openspec/changes/identidad-perfiles/` artifacts were staged; generated `node_modules`, `.prisma`, `dist`, and build metadata were not staged.

## Prisma Migration Diff Review Notes

The corrected Prisma 6.19.3 command was `npm exec --workspace=@repara/api -- prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`, because this CLI rejects the design's extra `--schema` option for `migrate diff`. It exited 0.

The declarative diff agrees with migration #2 on the `UserRole` enum, six tables, physical snake_case names, field types, primary keys, unique indexes, reverse specialty index, and all five restrictive/cascading foreign keys. Expected shape differences are that Prisma emits `CREATE SCHEMA IF NOT EXISTS "public"`, orders tables/indexes differently, omits the hand-authored `gen_random_uuid()` database defaults for Prisma `uuid()` client defaults, and omits checks and triggers that Prisma cannot express. The hand-authored migration remains authoritative; no live SQL execution is claimed.

## Final Delivery Accounting

- Final authored line count: `1,268` (computed from the committed diff with lockfile excluded).
- Size result: `size:exception` — the committed count exceeds 400; no minification or content removal was permitted.
- Deviations: none from the requested model block or migration SQL. The only command adjustment was removing unsupported `--schema` from `migrate diff`.
- Issues: no blocking implementation issue. `npm run lint` prints an existing Next.js pages-directory warning while exiting 0.
- Remaining tasks: none; `11/11` complete.

## Carried-Forward Statements

- Item #4 live apply → re-apply → status is **UNSATISFIED** because no disposable PostgreSQL instance exists.
- This change's hand-written checks and triggers are executable only by live PostgreSQL; offline evidence is STATIC pattern coverage, not executed-SQL proof.
- Item #6 MUST follow migration #2 because its catalog data and reads depend on the categories and districts skeletons created here.

## Status

Apply is complete and ready for `sdd-verify`. Independent verification must preserve the pending live gate and must not treat STATIC assertions as live database acceptance.
