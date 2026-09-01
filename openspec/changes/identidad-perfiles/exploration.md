## Exploration: BACKLOG.md item #5 — Persist identity and profiles

### Current State

The repository already contains the item #4 persistence foundation. `apps/api/prisma/schema.prisma` has a PostgreSQL datasource using `DIRECT_URL` and the `prisma-client-js` generator, but it declares no models. The committed baseline migration is comment-only, `migration_lock.toml` locks PostgreSQL, and the next migration is therefore the first domain migration. `apps/api/package.json` and `package-lock.json` already contain the exact matching `prisma` and `@prisma/client` `6.19.3` pair; adding these identity models requires no new runtime dependency.

The API has a process-scoped `PrismaService` seam that accepts runtime `DATABASE_URL` without connecting in its constructor, and the existing Vitest suite is deliberately offline. The existing migration acceptance record remains incomplete: no PostgreSQL server, `psql`, Docker, or port 5432 listener was available when item #4 was verified. Item #5 must carry forward offline-only evidence and must not claim live migration acceptance.

The working tree contains the scaffold and items #1–#4 implementation even though `openspec/config.yaml` still describes the repository as planning-only. That metadata mismatch is unrelated to this change and must not be corrected here.

#### Binding decisions from TECH-DESIGN.md and ADRs

The following are locked source decisions, quoted verbatim rather than re-decided here:

> “Todas las claves primarias de dominio serán identificadores opacos.” — `TECH-DESIGN.md` §5

> “`authSubject` único; correo normalizado; rol `CLIENT` o `TECHNICIAN` e inmutable en el MVP; Supabase Auth es la fuente autoritativa del correo” — `TECH-DESIGN.md` §5.1

> “Uno a uno con usuario cliente; nombre 2–100; teléfono E.164 de 8–15 dígitos” — `TECH-DESIGN.md` §5.1

> “Uno a uno con usuario técnico; descripción 20–1000; experiencia entera 0–80” — `TECH-DESIGN.md` §5.1

> “Clave única compuesta; al menos una especialidad para operar como técnico” — `TECH-DESIGN.md` §5.1

> “Las claves foráneas impiden referencias a perfiles, categorías, distritos, solicitudes o cotizaciones inexistentes.” — `TECH-DESIGN.md` §5.3

> “Borrar físicamente registros de negocio completados no forma parte del MVP.” — `TECH-DESIGN.md` §5.3

> “`users`, vinculado por un identificador único al proveedor de autenticación y con un rol exclusivo `CLIENT` o `TECHNICIAN`.” — ADR-0002

> “El rol de dominio y los datos de perfil se almacenarán en las tablas de la aplicación; la API no confiará para autorizar en metadatos editables enviados por el cliente.” — ADR-0006

> “Se usará Prisma ORM como cliente de PostgreSQL y herramienta principal de migraciones.” — ADR-0007

> “Cuando Prisma no pueda expresar una restricción, índice o migración PostgreSQL necesaria, la migración versionada incluirá SQL explícito. No se usará sincronización automática destructiva del esquema en entornos compartidos o productivos.” — ADR-0007

> “Se añadirá la entidad `districts` con identificador interno, código UBIGEO único, nombre, provincia, departamento y estado activo. `client_profiles` y `requests` referenciarán un distrito activo mediante clave foránea” — ADR-0018

> “`preferredAt`, `availableAt` y `scheduledAt` representarán instantes con fecha y hora. PostgreSQL los almacenará como `TIMESTAMPTZ`, normalizados a UTC” — ADR-0017

The role is assigned once during the later verified-session onboarding: “la API crea de forma idempotente `users` con el rol elegido una sola vez” and “no permitir cambiar el rol existente” (`TECH-DESIGN.md` §8.1). Registration and onboarding are item #12, not this change.

#### Model implied by the locked sources

`users` should store the domain identity only: an opaque primary key, unique authentication subject, normalized email copy, one role, and UTC timestamps. Passwords are not stored because Supabase Auth owns credentials. `client_profiles` and `technician_profiles` use `user_id` as their one-to-one primary/foreign key, which enforces at most one profile of each kind. A profile row is optional while a newly onboarded user is incomplete; fields inside an existing profile should be non-null and satisfy the documented bounds.

`technician_specialties` is a join table keyed by `(technician_id, category_id)`, with a UTC `created_at`, foreign keys to the technician profile and category, and a reverse category-first index for later opportunity queries. The “at least one” and “active category” rules are cross-row/catalog rules for later profile and specialty operations; a row-level check cannot count a technician’s specialties or inspect catalog activity safely.

The district and category foreign keys create a sequencing issue. Prisma cannot define a relation to a model that is absent from the schema, and PostgreSQL cannot create a foreign key to a table that has not yet been created. At the same time, #5 depends only on #4 while #6 owns catalog data and reads. The cleanest interpretation is to create empty `districts` and `categories` table definitions in #5 as schema prerequisites, with the exact fields already locked in `TECH-DESIGN.md`, but no seed rows, seed script, or catalog endpoint. Item #6 then owns seeding, active-catalog behavior, and reads. Execution must treat #6 as following the #5 migration even though the current backlog row does not express that edge.

### Affected Areas

- `apps/api/prisma/schema.prisma` — add the `UserRole` enum, `User`, `ClientProfile`, `TechnicianProfile`, `TechnicianSpecialty`, and the minimal empty `Category` and `District` catalog models. Map every physical table and column to the established snake_case convention while keeping Prisma/TypeScript names camelCase.
- `apps/api/prisma/migrations/<timestamp>_identidad_perfiles/migration.sql` — add the second migration after the empty baseline. It must contain real PostgreSQL DDL, named keys/indexes, profile/value checks, foreign keys, and explicit SQL for constraints Prisma cannot express, especially role immutability and profile-role consistency.
- `apps/api/prisma/migrations/migration_lock.toml` — retain the existing PostgreSQL provider lock; no provider or migration reset is allowed.
- `apps/api/src/database/` tests — add persistence contract tests that do not connect to PostgreSQL. Keep `PrismaService`, `DatabaseModule`, readiness, and the lazy lifecycle unchanged; model addition alone needs no runtime service or endpoint.
- `apps/api/package.json`, `package-lock.json`, and `.gitignore` — verify rather than expand. Prisma `6.19.3` is already pinned, generated output remains under ignored `node_modules`, and no phone-validation or ID package is required.
- `openspec/changes/identidad-perfiles/specs/` — the later delta spec should add identity/profile requirements and clarify the archived API-foundation migration wording that described the initial baseline as having no domain tables. The baseline remains empty; migration #2 is now intentionally populated. The canonical specs must not be edited during exploration.
- `packages/config`, `apps/web`, and HTTP controllers — no changes. OpenAPI, registration, profile editing, specialty endpoints, authentication/JWT, and web behavior belong to later backlog items.

#### Boundary analysis

**IN:** Prisma models and physical mappings; role/profile/specialty/catalog-reference constraints; opaque ID and timestamp representation; indexes needed by identity and specialty reads; second migration; offline persistence/schema tests; migration-diff evidence; preservation of the lazy Prisma seam.

**OUT:** registration and onboarding endpoints (#12); JWT/Auth/BFF behavior (#13); profile editing endpoints (#14/#15); specialty management endpoint and completeness behavior (#16); catalog seeds and catalog reads (#6); requests, quotes, services, reviews, images, money, and business state machines (#7–#9); production provisioning or release automation.

#### Offline-verifiable evidence

The following can be proven without a live database:

1. `prisma validate` with a temporary invocation-only `DIRECT_URL` proves schema syntax, enum declarations, relations, and Prisma-supported indexes.
2. `prisma generate` proves that the pinned client can generate model types and that Windows/OneDrive generation remains usable; generated files must remain ignored.
3. `prisma migrate diff --from-empty --to-schema-datamodel` produces reviewable SQL for Prisma-expressed tables, enums, keys, and indexes. It does not prove execution of hand-added checks or triggers.
4. Vitest contract tests can read `schema.prisma` and `migration.sql` and assert mapped snake_case names, required models, enum members, named checks, foreign keys, delete actions, uniqueness, and trigger statements. This is static evidence, not SQL execution.
5. If the generated client exposes `Prisma.dmmf`, a supplemental DMMF test can assert model/field/relation shape without a connection. DMMF cannot prove manual migration SQL, so it must not replace migration-text assertions.
6. Existing `npm test`, lint, format check, typecheck, and build gates can run offline. `prisma migrate deploy`, re-apply, status, rollback, PostgreSQL check execution, and pooler compatibility remain a recorded pending gate until disposable PostgreSQL exists.

### Approaches

1. **Complete relational identity migration with empty catalog prerequisites** — create all #5 models, empty `categories`/`districts` tables, database checks, explicit role/profile triggers, composite specialty uniqueness, and restrictive foreign keys in migration #2; leave all catalog data and API behavior to #6 and later items.
   - Pros: preserves the TECH-DESIGN foreign-key contract; makes #5 independently implementable after #4; rejects malformed values and cross-role profile corruption even outside the API; avoids a period with unconstrained references.
   - Cons: #5 temporarily owns catalog table definitions; the backlog execution graph must treat #6 as following this migration; hand-written PostgreSQL SQL needs careful review and later live execution.
   - Effort: Medium/High.

2. **Identity first, defer catalog foreign keys** — create users and profiles now, store `district_id`/`category_id` as scalar strings or omit specialties, and add relations in #6 after catalog tables exist.
   - Pros: keeps catalog table ownership visually isolated in #6; smaller first migration.
   - Cons: violates the locked referential-integrity direction for the period between migrations; Prisma cannot model the intended relations yet; invalid references can enter through direct SQL; later constraint backfill and sequencing become harder.
   - Effort: Medium now, High risk later.

3. **Run catalog schema before identity** — move the catalog table creation into #6 and make #5 depend on #6 for the foreign keys.
   - Pros: catalog ownership is clean and foreign keys are still real.
   - Cons: contradicts the current #5 dependency declaration, makes #5 unavailable after #4 alone, and forces a backlog/DAG correction before implementation.
   - Effort: Medium, with process-level dependency change.

### Open Decisions

Only the following axes are genuinely open; the binding choices above are not alternatives.

| Decision | Options | Recommendation |
|---|---|---|
| District/category FK timing | Empty catalog skeletons in #5; scalar/deferred FKs; reorder #5 after #6 | Create empty `districts` and `categories` schemas in migration #2, with no seed data, and run #6 afterward. Record the required sequencing edge in proposal/tasks rather than weakening the FK contract. |
| Domain ID representation | Native PostgreSQL UUID with Prisma `uuid()`; CUID/ULID strings; application-only `crypto.randomUUID()` | Use opaque UUID v4 IDs with `String @db.Uuid @default(uuid())`. It matches the opaque-ID rule, has native PostgreSQL storage, and requires no package. Keep `authSubject` as a separate provider-subject string. |
| Role representation | Prisma/PostgreSQL enum; string plus database `CHECK`; role table | Use a `UserRole` enum with exactly `CLIENT` and `TECHNICIAN`. A string check is more extensible, but the closed MVP set and generated type safety favor the enum. Do not create a mutable role table. |
| Role immutability and profile-role match | API/repository convention only; explicit PostgreSQL triggers; separate subtype user tables | Add explicit SQL triggers that reject role changes and reject a client profile for a technician user or vice versa, while also omitting role from update paths. This is the strongest defense for an authorization-critical invariant and is permitted by ADR-0007’s explicit-SQL rule. |
| Profile nullability | Optional profile row with required columns; nullable columns for partial profile drafts; separate draft tables | Keep the profile relation optional and make fields required when a row exists. Users can exist before completion; partial profile persistence is not silently invented for #5. |
| Phone storage | Free text; national number; canonical E.164 string | Store a string, not a numeric type, canonicalized as `+` followed by 8–15 digits and constrained by `^\\+[1-9][0-9]{7,14}$`. The API later owns user-facing normalization/messages; the database remains a final integrity boundary. |
| Text and experience bounds | API-only validation; PostgreSQL type lengths/checks; complex domain validation | Use `varchar` physical bounds plus named `CHECK` predicates on trimmed character length: names 2–100, description 20–1000, and integer `years_experience` 0–80. Reject blank/whitespace-only values in the database; semantic copy quality remains API scope. |
| Foreign-key deletes | Cascades; `RESTRICT`/`NO ACTION`; soft-delete columns | Use restrictive foreign keys and no `deleted_at` field in #5. Business records are not physically deleted in the MVP; user/profile deactivation or archival needs a later explicit decision. |
| Timestamp update mechanism | Prisma `@updatedAt`; database trigger; application-assigned timestamps | Map `createdAt`/`updatedAt` to `created_at`/`updated_at` and store them as UTC `TIMESTAMPTZ`; use Prisma `@updatedAt` with a database default for creation, without adding an unrelated trigger. |
| Indexes for later reads | Only primary/unique keys; broad indexing; targeted foreign-key indexes | Keep unique `auth_subject` and normalized email indexes, profile PK lookups by `user_id`, the specialty PK `(technician_id, category_id)`, and a reverse `(category_id, technician_id)` index. Do not add role/district indexes without a demonstrated #5/#6 query. |

### Recommendation

Proceed with approach 1. Add migration #2 with UUID-backed opaque IDs, a closed `UserRole` enum, mapped snake_case tables, UTC timestamps, non-null bounded profile fields, composite specialty uniqueness, targeted indexes, restrictive foreign keys, and explicit SQL triggers/checks for the invariants Prisma cannot express. Include empty `categories` and `districts` schemas solely so #5 can provide real foreign keys; add no catalog rows, seed command, endpoint, or active-catalog query. Treat #6 as the data/reading follow-up to this schema migration even if the current backlog text omits that operational ordering.

Keep the existing Prisma package pins and lazy client unchanged. Verify offline with `prisma validate`, generation, migration diff review, static migration/schema contracts, and the existing quality gates. Carry the item #4 `apply → re-apply → status` live migration gate forward as **UNSATISFIED**; the absence of PostgreSQL blocks live acceptance evidence but does not block proposal or offline implementation planning.

### Risks

- The biggest design risk is migration sequencing: omitting catalog skeletons weakens required foreign keys, while including them means #6 must execute after #5. Proposal/tasks must make that dependency explicit without adding catalog seed behavior to this change.
- PostgreSQL enum creation and hand-written role/profile triggers are not fully represented by Prisma’s declarative model. A generated migration diff can look correct while omitting manual SQL; migration review and static contract tests must cover both.
- Offline checks cannot execute `CHECK` predicates, triggers, foreign keys, delete actions, or migration metadata. They cannot prove `migrate deploy`, re-application, rollback, pooler behavior, or SQL compatibility with Supabase; the live gate must remain unsatisfied.
- Active district/category rules and “at least one specialty” are cross-row rules. FKs prove existence, but item #6 and endpoints #14–#16 must revalidate active catalog state and specialty counts inside their writes.
- API-only role enforcement would permit invalid direct SQL and compromise authorization. The recommended triggers add complexity and must be covered by a future disposable-PostgreSQL test once infrastructure is available.
- A profile with required columns is safe only if later profile endpoints create/update a complete row rather than persisting partial values. If incremental drafts are required, that is a follow-up schema decision, not an implicit nullable migration.
- Prisma binary engines, generated files, file locks, antivirus, and OneDrive synchronization can make Windows generation unreliable. Exact pins and ignored generated output reduce, but do not eliminate, that risk.
- The existing API-foundation spec’s empty-baseline wording can become misleading after migration #2. The later delta must clarify that only migration #1 is empty; do not rewrite the canonical spec during exploration.

### Ready for Proposal

Yes. The model, scope, locked constraints, FK sequencing recommendation, offline evidence limits, and live-gate blocker are sufficiently clear for proposal work. The proposal should freeze the recommended open-axis choices, make #6’s post-migration ordering explicit, and preserve the rule that #5 contains persistence only—not registration, profile/specialty HTTP endpoints, authentication, or catalog seed data.
