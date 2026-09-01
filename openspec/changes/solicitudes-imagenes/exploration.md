## Exploration: BACKLOG.md item #7 — Persist requests, upload reservations, and images

### Current State

The repository has the persistence foundation and the catalog/identity tables from items #4–#6. `apps/api/prisma/schema.prisma` uses PostgreSQL through `DIRECT_URL`, the `prisma-client-js` generator, UUID-backed opaque IDs, and mapped snake_case physical names. It currently declares six models: `User`, `ClientProfile`, `TechnicianProfile`, `TechnicianSpecialty`, `Category`, and `District`; it declares only the `UserRole` enum. `District.ubigeo` maps to the already-stable physical `ubigeo_code`, and the catalog models must not be renamed or recreated.

Migration order is the empty `00000000000000_baseline` followed by `20260901000000_identity_profiles` (migration #2). The PostgreSQL provider lock is unchanged. There are no request, upload-reservation, or request-image models, relations, enums, migration tables, or persistence contract tests today. Prisma and `@prisma/client` are both pinned to `6.19.3`; the existing API test suite is Vitest-based and offline. The prior verification records the migration apply → re-apply → status check as a **RECORDED PENDING GATE** because no disposable PostgreSQL instance was available. Item #7 must preserve that limitation.

The stale planning-only description in `openspec/config.yaml` is not consistent with the implemented workspace, but it is unrelated to this change and must not be corrected here.

#### Locked model and lifecycle decisions

The following source decisions are binding and are quoted rather than re-decided:

> “Todas las claves primarias de dominio serán identificadores opacos.” — `TECH-DESIGN.md` §5

> “`requests` | `id`, `clientId`, `categoryId`, `districtId`, `title`, `description`, `preferredAt`, `status`, `publishedAt`, cancelación, timestamps | Título 5–120; descripción 20–2000; índices por estado/categoría/publicación y cliente/publicación” — `TECH-DESIGN.md` §5.1

> “`upload_reservations` | `id`, `requestId`, `objectKey`, tamaño/tipo declarados, `status`, `expiresAt`, `confirmedAt` | Object key único; solo para borradores propios; expira y se limpia” — `TECH-DESIGN.md` §5.1

> “`request_images` | `id`, `requestId`, `objectKey`, `mimeType`, `byteSize`, `position`, timestamps | Object key único; posición única por solicitud; 1–3 al publicar; máximo 5 MiB” — `TECH-DESIGN.md` §5.1

> “Los campos de cancelación son `cancelledAt`, `cancelledByUserId` y `cancellationReason`; el motivo tiene 10–500 caracteres.” — `TECH-DESIGN.md` §5.1

The locked relationships are:

> “`client_profiles 1---* requests ---1 categories`”  
> “`requests *---1 districts`”  
> “`requests 1---* request_images`”  
> “`requests 1---* upload_reservations`” — `TECH-DESIGN.md` §5.2

The request state set and transitions are exactly:

> “`DRAFT` | Publicar | Cliente propietario | `PUBLISHED` | Perfil y correo válidos, categoría/distrito activos, fecha futura, campos válidos y 1–3 imágenes confirmadas”  
> “`DRAFT` | Descartar | Cliente propietario | Eliminada | No visible; limpiar reservas y objetos”  
> “`PUBLISHED` | Seleccionar cotización | Cliente propietario | `ASSIGNED` | Cotización activa con disponibilidad todavía futura; crea servicio en la misma transacción”  
> “`PUBLISHED` | Cancelar | Cliente propietario | `CANCELLED` | Motivo válido; cierra cotizaciones activas” — `TECH-DESIGN.md` §6.1

> “`ASSIGNED` y `CANCELLED` son terminales para la solicitud. El progreso posterior se obtiene del servicio.” — `TECH-DESIGN.md` §6.1

The image policy is also locked:

> “De una a tres imágenes confirmadas por solicitud publicada.”  
> “Formatos reales permitidos: JPEG, PNG y WebP.”  
> “Tamaño máximo: 5 MiB por objeto.”  
> “Bucket privado; rutas aleatorias y no proporcionadas por el usuario.”  
> “URL firmada de carga y lectura con 10 minutos de vigencia.”  
> “El límite de 5 MiB equivale a 5 242 880 bytes y se comprueba después de cargar antes de vincular el objeto.” — `TECH-DESIGN.md` §9.1

The persistence/storage boundary is:

> “Cada carga parte de una reserva persistida con expiración.”  
> “Confirmar verifica el objeto antes de crear `request_images`.”  
> “Publicar bloquea el borrador y cuenta únicamente imágenes confirmadas.” — `TECH-DESIGN.md` §9.2

> “La API cuenta reservas activas e imágenes confirmadas bajo bloqueo para no superar tres imágenes.” — `TECH-DESIGN.md` §5.3

> “Supabase Storage guardará los objetos de imagen; PostgreSQL conservará únicamente su identificador o ruta estable y metadatos necesarios, no una URL firmada temporal.” — ADR-0006

> “Cuando Prisma no pueda expresar una restricción, índice o migración PostgreSQL necesaria, la migración versionada incluirá SQL explícito.” — ADR-0007

> “La API controlará estas carreras mediante transacciones PostgreSQL cortas con bloqueo pesimista de la fila que representa el agregado modificado y revalidación dentro de la transacción.” — ADR-0015

> “`requests` incorporará el estado interno `DRAFT`.” — ADR-0019

`preferredAt`, `expiresAt`, `confirmedAt`, `publishedAt`, and cancellation timestamps should use the established UTC `TIMESTAMPTZ(6)` convention. The exact temporal decision is locked for domain instants by:

> “`preferredAt`, `availableAt` y `scheduledAt` representarán instantes con fecha y hora. PostgreSQL los almacenará como `TIMESTAMPTZ`, normalizados a UTC” — ADR-0017

There is one important specification gap: the locked documents require a `status` on `upload_reservations`, but they do **not** enumerate its allowed values. `request_images` has no `status` field in the locked entity row; `request_images` is created only after real-object validation, so row existence represents a confirmed image. The names `RESERVED` and `CONFIRMED` are useful candidate reservation states from the requested topic, but they are not literal enum definitions in `TECH-DESIGN.md` or the ADRs. The proposal must freeze them without presenting them as already locked. Expired reservations and unlinked Storage objects are cleanup concerns, not a required persistent `ORPHAN` image state.

### Affected Areas

- `apps/api/prisma/schema.prisma` — add `Request`, `UploadReservation`, and `RequestImage`; add the `RequestStatus` enum and the selected reservation-status representation; extend existing `ClientProfile`, `Category`, and `District` relations without changing their physical keys or fields.
- `apps/api/prisma/migrations/<timestamp>_requests_images/migration.sql` — add migration #3 with the three tables, PostgreSQL enums, named primary/unique/check constraints, restrictive foreign keys, and targeted indexes. Hand-written SQL is required for checks and any selected partial index or state metadata rule that Prisma cannot express. The migration must contain no seed rows, Storage calls, signed URLs, or endpoint behavior.
- `apps/api/src/database/request-image-schema.spec.ts` — static schema/DMMF contract for model names, selected enum members, camelCase-to-snake_case mappings, nullability, relations, bounded metadata, and unique/index declarations.
- `apps/api/src/database/request-image-migration.spec.ts` — static migration-text contract for the three tables, named keys/checks/indexes, enum DDL, restrictive delete actions, and any explicit SQL functions/triggers selected by the design. Assertions must be labeled `STATIC`; they cannot claim executed-SQL proof.
- `apps/api/prisma/migrations/migration_lock.toml` — read-only; retain `provider = "postgresql"`.
- `apps/api/package.json`, `package-lock.json`, and `.gitignore` — verify only. No dependency or manifest change is expected for model-only persistence tests; generated Prisma output remains ignored.
- Later canonical specs — the eventual delta should describe this persistence contract, but exploration must not edit `openspec/specs/` or archived artifacts.

### Approaches

The separate `requests`/`upload_reservations`/`request_images` shape is binding from the design and is not an open alternative. The genuinely open enforcement choices are:

1. **Prisma enums, same-row SQL checks, and API-owned cross-row lifecycle** — use a closed `RequestStatus`; use a closed reservation enum once its values are frozen; represent confirmed images by `request_images` rows; enforce metadata and cancellation/published-column consistency in PostgreSQL; leave ownership, active-catalog checks, legal transitions, and the three-row count to later API transactions that lock the request.
   - Pros: follows ADR-0002/0015, preserves the explicit reservation table, gives generated type safety, keeps migration #3 persistence-only, and does not pretend a row `CHECK` can count related rows.
   - Cons: direct SQL could bypass the legal transition matrix unless the database is restricted to the API; the later endpoint work must implement the lock-and-revalidate contract correctly.
   - Effort: Medium.

2. **String statuses plus explicit PostgreSQL transition triggers** — store status as text with named `CHECK` membership and add `OLD`/`NEW` transition functions for the request and reservation lifecycles.
   - Pros: stronger protection against arbitrary direct status updates and easier future state additions without an enum migration.
   - Cons: more hand-authored SQL, trigger behavior not represented by Prisma/DMMF, harder offline proof, and overlap with the API transaction rules already locked by ADR-0015.
   - Effort: Medium/High.

3. **Enum statuses plus a database trigger for the image-count invariant** — retain the recommended shape but make insertion/confirmation of reservations or images invoke a cross-table count trigger.
   - Pros: attempts to protect the maximum of three at the database boundary.
   - Cons: a row check cannot do this; a trigger must coordinate locks across the request, reservations, and images, risks deadlocks or inconsistent treatment of expired reservations, and duplicates the explicit “API counts ... bajo bloqueo” rule. It also cannot verify Storage bytes or MIME content.
   - Effort: High.

### Boundary Analysis

**In scope:**

- Prisma models and relations for requests, upload reservations, and confirmed request images.
- Request status persistence with exactly `DRAFT`, `PUBLISHED`, `ASSIGNED`, and `CANCELLED`.
- Locked request fields, cancellation metadata, UTC timestamp representation, stable object-key storage, declared versus verified image metadata, and the 1–3/5 MiB/JPEG-PNG-WebP limits at the appropriate persistence boundary.
- Named primary keys, unique object keys, unique request positions, restrictive FKs to the existing client-profile/category/district/request targets, and indexes for later client, opportunity, and cleanup reads.
- Migration #3 and offline static schema/migration contracts; optional fake-client tests only if a persistence helper is introduced. No fake endpoint or Storage behavior is needed for a model-only change.
- Static Prisma validation/generation and existing offline quality gates when the implementation phase runs. The live migration gate remains pending.

**Out of scope:**

- Request draft CRUD and publish endpoints (#17/#22), reservation/upload flow (#19), confirmation/read authorization (#20), cleanup command and Storage orphan deletion (#21), or publication/list/detail behavior (#22/#24–#27).
- Supabase Storage bucket/policy/provider infrastructure (#11), signed URL issuance, object existence/content inspection, MIME sniffing, or file processing.
- OpenAPI/client artifacts (#10), authentication/session/authorization implementation, profile behavior, and web UI.
- Quotes and money (#8), services/reviews (#9), quote/service state machines, selection transactions, or publication side effects beyond fields required to persist the request state.
- New catalog rows, catalog endpoint behavior, category/district seed changes, or modifications to migration #2.
- Soft-delete columns, audit/event history, global object-key registries, automatic expiration based on `NOW()` in a PostgreSQL `CHECK`, or a separate upload-token service.

### Open Decisions

| Decision | Options | Recommendation |
|---|---|---|
| Reservation states | Prisma enum; text plus named `CHECK`; status omitted | Use a Prisma `UploadReservationStatus` enum with `RESERVED` and `CONFIRMED` as the proposed closed set. Treat expiry as `expiresAt` plus physical cleanup, not as a durable `EXPIRED` state. This is a proposal choice, not a source quote. |
| Image state | Add `ImageStatus`; use reservation status; row existence means confirmed | Do not add `ImageStatus`. Keep reservation lifecycle in `upload_reservations`; create `request_images` only after actual validation, so its row is the confirmed image. Do not persist an `ORPHAN` row for an unlinked Storage object. |
| Reservation identifier/token | UUID `id` exposed later as upload ID; separate opaque token column; numeric sequence | Use the existing opaque UUID pattern for `id`, with a unique primary key. Do not add a separate token column or make a signed URL persistent. Later API naming is #19/#20. |
| Object-key storage | One stable `objectKey`; bucket plus key columns; signed URL column | Use one `objectKey` column in each model, with a named unique constraint/index. The bucket is configured infrastructure, and the database stores no signed URL. A cross-table global uniqueness rule would require a new registry and is not justified by the locked model. |
| Declared and verified metadata | Minimal locked fields; add filename/checksum/dimensions; JSON metadata | Persist only reservation declared size/type and image verified `mimeType`/`byteSize`, plus the locked image `position`. Do not add original filename, checksum, width, or height; none is locked in the entity model. |
| Metadata constraints | API-only; database checks on declared and verified metadata; Storage-only limits | Add named checks for positive size and `byteSize <= 5,242,880`, and allowed MIME values on persisted metadata. Keep real-byte/format verification in #20 because a database check validates metadata, not object contents. |
| Three-image limit | Row `CHECK`; API transaction under request lock; cross-table trigger | Use the locked API transaction: lock the draft request, count active reservations plus confirmed image rows, and reject capacity overflow. No row `CHECK` or migration trigger should claim to enforce a cross-row count in #7. |
| Request transition enforcement | Request enum only; SQL transition trigger; later API lock/revalidate | Use the enum plus same-row metadata checks in #7. Later commands must implement the exact transition matrix inside a short transaction with the request lock, as ADR-0015 requires. A trigger is optional only if a new design decision accepts its SQL/test cost; it is not needed for this persistence-only item. |
| Request indexes | Minimal unique/FK indexes; targeted composite indexes; broad indexing | Add targeted indexes matching the locked “state/category/publication” and “client/publication” paths, with `id` as deterministic tie-breaker: `(status, category_id, published_at, id)` and `(client_id, published_at, id)`. Freeze sort direction and names in design; add no unproven role/district indexes. |
| Reservation cleanup index | `(request_id, status)`; `(status, expires_at)`; partial `expires_at` index | Use a request/status index for locked capacity and relation reads plus a partial `expires_at` index for `status = 'RESERVED'`. If Prisma cannot express the predicate, add explicit SQL with a named index. |
| Delete behavior | Cascades; restrictive FKs with ordered temporary cleanup; soft delete | Use restrictive FKs throughout. Cleanup/discard must explicitly remove temporary reservation/image children before a draft request, while published/assigned/cancelled business records cannot be removed through cascades. Do not add `deletedAt`. |
| Cancellation actor FK | `users.id`; `client_profiles.user_id`; no FK | Use a restrictive FK to `users.id` and leave role/ownership validation to the later API transaction. This supports the locked `cancelledByUserId` shape without inventing a request-specific actor table. |
| Reservation timestamps | Only locked `expiresAt`/`confirmedAt`; standard created/updated pair; audit history | Keep the minimal locked reservation fields: `expiresAt` and nullable `confirmedAt`; do not add reservation audit timestamps without a new requirement. Request and image timestamps follow the explicit entity rows and existing `createdAt`/`updatedAt` convention. |

### Recommendation

Proceed with Approach 1. Migration #3 should add three normalized tables, use UUID opaque IDs and mapped snake_case names, introduce `RequestStatus` with exactly the four locked request states, and adopt the proposed `RESERVED`/`CONFIRMED` reservation enum only after explicitly recording that those values are an implementation choice. `request_images` should have no state column: a row is created only after the later confirmation flow validates the Storage object.

Use restrictive FKs to `ClientProfile.userId`, `Category.id`, `District.id`, and `Request.id`; use a restrictive `users.id` FK for cancellation actors. Use named same-row checks for text/metadata bounds and state-associated timestamp/cancellation fields, but do not use volatile “future” checks or pretend a row check can enforce image cardinality. The later API owns ownership, active catalog validation, state transitions, and the locked count of active reservations plus confirmed images under a request-row lock.

Persist only stable random `objectKey` values and metadata; never persist signed URLs, bucket credentials, original file bytes, or untrusted user-provided paths. Add targeted request, reservation-expiry, and image-position/object-key indexes. Keep migration #2, the provider lock, package manifests, catalog seeds, and runtime Prisma lifecycle unchanged. Verify statically with schema/migration contract tests, Prisma validation/generation, and existing quality gates; preserve the live apply → re-apply → status gate as **UNSATISFIED/RECORDED PENDING** until disposable PostgreSQL exists.

### Risks

- **Unenumerated reservation states:** `status` is required but its members are absent from the locked source. The proposal must freeze the recommendation without falsely attributing `RESERVED`/`CONFIRMED` to TECH-DESIGN.md.
- **Cross-row cardinality:** the maximum of three combines active reservations and confirmed images and cannot be expressed by a row `CHECK`. A later implementation that counts without locking the request can race with another upload.
- **State enforcement split:** enums prevent unknown values but not illegal `OLD`→`NEW` transitions. The API must implement the exact matrix under ADR-0015’s lock; adding a trigger later would require live PostgreSQL proof and additional SQL review.
- **Storage/database non-atomicity:** a loaded object can remain unlinked when confirmation fails. The model must retain enough stable key/expiry data for #21 to delete expired reservations and orphaned Storage objects without adding an orphan business state.
- **Delete semantics:** cascades could remove confirmed images or other business data unexpectedly. Restrictive FKs require cleanup/discard to delete temporary children in a deliberate order before deleting an abandoned draft.
- **Source inconsistency on image minimum:** the PRD says “up to three,” while approved TECH-DESIGN.md and ADR-0019 require 1–3 confirmed images for publication. #7 should follow the approved design and record the discrepancy rather than silently changing the minimum.
- **Object-key uniqueness scope:** separate reservation and image tables cannot enforce a single global unique key without a registry. The recommended model keeps each table’s locked uniqueness and treats cross-table collision as an extremely unlikely random-key concern; a global registry would be scope expansion.
- **FK target stability:** `ClientProfile.userId`, `Category.id`, and `District.id` are current physical contracts from #5/#6. Renaming or recreating catalog skeletons would invalidate this migration and downstream consumers.
- **Offline proof limit:** static tests can inspect SQL text and Prisma shape but cannot prove checks, triggers, FK actions, index predicates, migration application, rollback, or concurrent locking. Those remain a pending live gate.
- **Migration/manual SQL size:** adding named checks and partial indexes by hand can diverge from Prisma’s generated diff. The implementation must compare declarative diff output with migration #3 and keep all manual SQL covered by static assertions.

### Ready for Proposal

Yes. The approved request lifecycle, separate reservation/image entities, field/limit metadata, FK targets, deletion boundary, index consumers, offline evidence pattern, and pending live gate are clear enough for proposal work. The proposal should freeze the recommended reservation enum, no-image-status rule, index names/order, restrictive deletes, metadata checks, and API-owned cross-row/state enforcement while keeping all endpoint, Storage, cleanup-job, and publication behavior in later backlog items.
