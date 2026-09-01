# Pre-Proposal State — gentle-ai.sdd-preproposal/v1

- revision: 1
- status: confirmed
- exploration: `openspec/changes/identidad-perfiles/exploration.md`
- research: unselected
- proposal_ready: true
- confirmed_by: orchestrator (auto mode mandate 2026-09-01 — recommended options auto-selected)

## Confirmed product decisions

| # | Decision | Confirmed value |
|---|----------|-----------------|
| 1 | catalog_fk_timing | `empty-catalog-skeletons-in-#5` — migration #2 creates `categories` + `districts` table STRUCTURES (fields locked by TECH-DESIGN/ADR-0018) with NO rows, seeds, endpoints, or active-catalog queries; #6 owns data/reads and MUST execute after this migration (sequencing edge recorded explicitly) |
| 2 | id_representation | `uuid-v4-native` — `String @id @db.Uuid @default(uuid())` opaque IDs; `authSubject` separate provider-subject string |
| 3 | role_representation | `userrole-enum` — PostgreSQL/Prisma enum `UserRole { CLIENT, TECHNICIAN }`; no role table |
| 4 | role_immutability | `pg-triggers` — explicit SQL triggers reject role UPDATE and reject profile-role mismatch (client profile for technician user and vice versa); permitted by ADR-0007 explicit-SQL rule |
| 5 | profile_nullability | `optional-row-required-fields` — profile relation optional (user may exist before completion); all fields required when the row exists |
| 6 | phone_storage | `e164-string-check` — string with CHECK `^\+[1-9][0-9]{7,14}$` (8–15 digits) |
| 7 | text_bounds | `varchar-named-checks` — trimmed char length: client name 2–100; technician professional name 2–100; description 20–1000; `years_experience` int 0–80; blank/whitespace-only rejected at DB |
| 8 | fk_deletes | `restrict-no-soft-delete` — restrictive FKs; no deleted_at in #5 |
| 9 | timestamps | `timestamptz-utc-prisma-updatedAt` — created_at DB default now(), updated_at Prisma @updatedAt, both TIMESTAMPTZ |
| 10 | indexes | `targeted-only` — unique auth_subject; normalized email index; profile PKs = user_id (1:1); specialty composite PK (technician_id, category_id) + reverse (category_id, technician_id); no speculative indexes |

## Locked conventions from TECH-DESIGN/ADRs (binding)

- Opaque primary keys (TD §5); users: unique authSubject, normalized email copy, role CLIENT|TECHNICIAN immutable in MVP, Supabase Auth owns credentials — NO passwords stored (TD §5.1)
- client_profiles 1:1 with client user (name 2–100, E.164 phone); technician_profiles 1:1 with technician user (description 20–1000, experience 0–80); specialties composite unique, >=1 to operate (cross-row rule = later items) (TD §5.1)
- FKs must prevent nonexistent references (TD §5.3); no physical deletion of business records in MVP (TD §5.3)
- districts entity: internal id, unique UBIGEO code, name, province, department, active state; client_profiles/requests FK to active district (ADR-0018)
- Domain role/profile data in app tables; API never authorizes from client-editable metadata (ADR-0006); Prisma + versioned migrations + explicit SQL when Prisma can't express (ADR-0007)
- snake_case physical names, camelCase TS; role assigned once at onboarding (#12), never changed (TD §8.1)

## Capability impact (binding)

NEW capability `identity-persistence` (models, constraints, migration, offline persistence contracts). MODIFIED `api-foundation`: clarify the reproducible-migration-baseline requirement wording — migration #1 remains the empty baseline; subsequent versioned domain migrations are expected (no semantic change to verification obligations).

## Scope boundary (binding)

IN: Prisma models (User, ClientProfile, TechnicianProfile, TechnicianSpecialty + empty Category/District skeletons), snake_case mappings, named checks/indexes/FKs, explicit SQL triggers, migration #2, offline persistence contract tests (schema/migration static assertions, DMMF shape), migrate-diff evidence. OUT: registration/onboarding endpoints (#12), auth/JWT/BFF (#13), profile endpoints (#14/#15), specialty endpoint (#16), catalog seeds/reads/active behavior (#6), requests/quotes/services/reviews (#7–#9), money, deployment.

## Carried forward (binding)

Item #4 live migration gate (apply→re-apply→status on disposable PostgreSQL) remains UNSATISFIED; #5 uses the same offline-only verification pattern and MUST NOT claim live acceptance. Accepted risk: 3 high audit findings confined to prisma CLI dev chain.
