# Proposal: Implement BACKLOG.md item #5: Persist identity and profiles

## Intent
Persist domain identity—immutable-role users, bounded 1:1 profiles, and technician specialties—in PostgreSQL migration #2, with database constraints as the final integrity boundary (TECH-DESIGN §§5/5.1/5.3; ADR-0002/0006/0007/0018).

## Scope
### In Scope
- Prisma models, snake_case mappings, named constraints/indexes/FKs, empty catalog skeletons, and migration #2.
- Explicit role/profile triggers/checks; offline schema, migration-text, DMMF, and quality-gate verification.

### Out of Scope
- Endpoints, registration/onboarding, authentication/JWT/BFF, profile/specialty APIs, catalog rows/seeds/reads, or active behavior; no passwords (Supabase Auth owns credentials).
- Other business entities, deployment, or live-DB claims.

## Capabilities
### New Capabilities
- `identity-persistence`: identity, profiles, specialties, catalog prerequisites, and offline persistence contracts.

### Modified Capabilities
- `api-foundation`: clarify migration #1 as the empty baseline; later versioned domain migrations are expected. Verification obligations are unchanged.

## Approach
- Preserve Prisma/@prisma-client `6.19.3`, ignored output, and the lazy process-scoped seam. Map camelCase to snake_case; use UTC `TIMESTAMPTZ`, `createdAt` DB default, and `updatedAt` `@updatedAt`.
- Add `UserRole { CLIENT, TECHNICIAN }`; `User` (UUID PK, unique authSubject, normalized/indexed email, role, timestamps); optional `ClientProfile` (user_id PK/FK, required name 2–100, E.164 phone, district_id); optional `TechnicianProfile` (user_id PK/FK, required professionalName 2–100, description 20–1000, phone, years 0–80); `TechnicianSpecialty` (technician_id+category_id PK, created_at, reverse index); empty `Category` (id, unique slug, name, active) and `District` (id, unique UBIGEO, name, province, department, active).
- Migration #2: named keys/indexes/checks/FKs, RESTRICT deletes, trimmed-length/E.164 checks, explicit role-immutability/profile-role-match triggers; no rows/seeds. Verify validate/generate, baseline diff/SQL review, static contracts (trigger assertions), DMMF shape, and quality gates.

## Pending Gate and Sequencing
- Item #4 live apply → re-apply → status remains **UNSATISFIED**. #5 adds hand-written triggers/checks executable only by live PostgreSQL; offline evidence is static/pattern-based and cannot claim acceptance.
- Item #6 MUST follow this migration because its catalog data/reads depend on these skeletons; record the edge without editing `BACKLOG.md`.

## Affected Areas
| Area | Impact | Description |
|---|---|---|
| `apps/api/prisma/schema.prisma` | Modified | Models and skeletons. |
| `apps/api/prisma/migrations/<ts>_identity_profiles/migration.sql` | New | Migration #2 DDL/SQL. |
| `apps/api/src/database/` contract tests | New | Offline assertions. |
| Other files/manifests | None | Pins, manifests, seam, dependencies unchanged. |

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Migration sequencing | High | Record #6 after #5. |
| Hand-written SQL unexecuted offline | High | Static assertions; pending gate. |
| Prisma enum/trigger representation gap | Medium | Review explicit SQL. |
| Cross-row rules deferred | Medium | Defer active/count checks. |
| Later endpoint profile completeness assumption | Medium | Require complete rows. |
| Windows/OneDrive generation | Medium | Preserve pins/ignored output. |
| Scope leakage | Medium | Enforce boundaries. |

## Rollback Plan
One commit; revert it to remove models, migration #2, and tests. Baseline/foundation remain untouched; no local data exists.

## Dependencies
- Item #4 is archived; no external services. Item #6 follows this migration.

## Success Criteria
- [ ] Validate/generate succeed; baseline migration diff/review covers expected DDL, named checks/FKs/indexes, and trigger SQL.
- [ ] Static contracts assert models/enum/bounds/triggers/FKs/indexes/delete rules; quality gates pass.
- [ ] No runtime dependencies change; generated output stays ignored; live gate is **NOT SATISFIED**; #6 sequencing is recorded.
