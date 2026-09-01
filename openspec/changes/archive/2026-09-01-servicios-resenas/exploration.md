## Exploration: BACKLOG.md item #9 — Persist services and reviews

### Current State

The checked-in persistence layer already contains the quote aggregate and its
dependencies. `apps/api/prisma/schema.prisma` currently declares ten models and
four enums: `UserRole`, `RequestStatus`, `UploadReservationStatus`, and
`QuoteStatus`. There is no `Service`, `Review`, `ServiceStatus`, service table,
review table, or service/review persistence contract.

The migration chain is an empty baseline (`00000000000000_baseline`), identity
and profiles (`20260901000000_identity_profiles`), requests and images
(`20260901000001_requests_images`), and quotes
(`20260901000002_quotes`). Therefore this change appends migration #5 as
`20260901000003_services_reviews`; prior migrations and
`migration_lock.toml` must remain unchanged. The quote model already exposes
`Request.quotes` and `TechnicianProfile.quotes`, and its technician index is
led by `technicianId`, which is useful for the later reputation join.

The repository uses Prisma enums, opaque UUIDs, mapped snake_case columns,
`TIMESTAMPTZ(6)`, hand-authored named PostgreSQL checks, restrictive foreign
keys (`ON DELETE RESTRICT ON UPDATE CASCADE`), and directed read indexes. The
request migration demonstrates all-or-nothing cancellation and state
consistency checks. The identity migration demonstrates that a hard
immutability rule can use a PostgreSQL trigger, while the request and quote
migrations deliberately leave legal state transitions to later locked API
commands. Offline Vitest contracts read schema and migration text. The three
compatibility suites currently assert ten models:
`identity-schema.spec.ts`, `request-image-schema.spec.ts`, and
`quote-schema.spec.ts`; adding two models requires all three assertions to
become twelve.

No ADR in the inspected set adds a review-specific rating, immutability, or
physical service-field decision. ADR-0002 defines the normalized service and
review relationships, ADR-0013 defines the confirmation state, ADR-0014 the
phase-specific terminal cancellation policy, ADR-0015 the service/review
locking boundary, ADR-0017 UTC instants, and ADR-0006/0007 the Supabase,
Prisma, migration, and database-constraint policies. The exact rating bounds
and review immutability are locked by `TECH-DESIGN.md` and `BACKLOG.md`, but
their enforcement mechanisms are not.

The current workspace has runnable API and web projects despite the stale
planning-only description in `openspec/config.yaml`; that metadata is outside
this change and must not be corrected here. The carried-forward live gate is
still `UNSATISFIED / RECORDED PENDING`: no disposable PostgreSQL instance is
available to prove migration apply, re-apply, status, seed execution, or
concurrency behavior. Static assertions must not be reported as executed-SQL
or race proof.

#### Binding definitions from the approved sources

The backlog boundary and downstream ownership are explicit:

> “| 9 | Persistir servicios y reseñas | Modelar servicios y reseñas con relaciones uno a uno, estados, cancelación y restricciones de integridad. | #4, #8 | — |” — `BACKLOG.md`

> “| 31 | Seleccionar una cotización | En una transacción, seleccionar una propuesta, cerrar las demás, asignar la solicitud y crear exactamente un servicio. | #9, #30 | — |” — `BACKLOG.md`

> “| 33 | Consultar servicios asignados | Listar y mostrar a las partes autorizadas el servicio, programación, contacto y línea de progreso combinada. | #31, #32 | — |” — `BACKLOG.md`

> “| 34 | Iniciar un servicio | Permitir solo al técnico seleccionado cambiar de `SCHEDULED` a `IN_PROGRESS` con bloqueo y manejo de conflicto. | #33 | — |” — `BACKLOG.md`

> “| 35 | Reportar el trabajo terminado | Permitir solo al técnico seleccionado cambiar de `IN_PROGRESS` a `AWAITING_CONFIRMATION`. | #34 | — |” — `BACKLOG.md`

> “| 36 | Confirmar la finalización | Permitir solo al cliente propietario cambiar de `AWAITING_CONFIRMATION` a `COMPLETED` y habilitar la reseña. | #35 | — |” — `BACKLOG.md`

> “| 37 | Cancelar un servicio | Aplicar permisos de cancelación por fase, registrar actor, fecha y motivo y evitar reapertura o nuevas transiciones. | #33, #35, #36 | — |” — `BACKLOG.md`

> “| 38 | Publicar una reseña | Permitir al cliente crear una única reseña inmutable para un servicio completado, incluso ante concurrencia. | #36 | — |” — `BACKLOG.md`

> “| 39 | Mostrar la reputación del técnico | Calcular promedio y cantidad desde reseñas persistidas y mostrarlos en perfil y comparación sin duplicar el promedio. | #15, #30, #38 | — |” — `BACKLOG.md`

The exact locked entity rows are:

> “| `services` | `id`, `requestId`, `selectedQuoteId`, `scheduledAt`, `status`, cancelación, timestamps de transición | Solicitud y cotización seleccionada únicas; índices por estado y creación; el técnico se resuelve mediante la cotización seleccionada |” — `TECH-DESIGN.md` §5.1

> “| `reviews` | `id`, `serviceId`, `clientId`, `rating`, `comment`, `createdAt` | Una por servicio; rating entero 1–5; comentario opcional máximo 1000; inmutable |” — `TECH-DESIGN.md` §5.1

> “Los campos de cancelación son `cancelledAt`, `cancelledByUserId` y `cancellationReason`; el motivo tiene 10–500 caracteres.” — `TECH-DESIGN.md` §5.1

The locked relationships are:

> “requests 1---0..1 services ---1 quotes (selectedQuoteId)” — `TECH-DESIGN.md` §5.2

> “services 1---0..1 reviews” — `TECH-DESIGN.md` §5.2

The selected quote must remain attached to the same request:

> “La cotización seleccionada debe pertenecer a la misma solicitud del servicio; esta invariante se valida en transacción y, cuando sea viable, mediante restricción SQL adicional.” — `TECH-DESIGN.md` §5.3

The complete locked service matrix is:

> “| Estado origen | Acción | Actor | Estado destino |”
>
> “| `SCHEDULED` | Iniciar | Técnico seleccionado | `IN_PROGRESS` |”
>
> “| `SCHEDULED` | Cancelar | Cliente propietario o técnico seleccionado | `CANCELLED` |”
>
> “| `IN_PROGRESS` | Reportar trabajo terminado | Técnico seleccionado | `AWAITING_CONFIRMATION` |”
>
> “| `IN_PROGRESS` | Cancelar | Cliente propietario o técnico seleccionado | `CANCELLED` |”
>
> “| `AWAITING_CONFIRMATION` | Confirmar | Cliente propietario | `COMPLETED` |”
>
> “| `AWAITING_CONFIRMATION` | Cancelar | Cliente propietario | `CANCELLED` |” — `TECH-DESIGN.md` §6.3

> “`COMPLETED` y `CANCELLED` son terminales. Solo `COMPLETED` admite crear una reseña.” — `TECH-DESIGN.md` §6.3

The accepted ADRs assign behavior to later commands rather than to this
modeling change:

> “Se usará un modelo relacional normalizado con las siguientes entidades lógicas:” — ADR-0002

> “`services`, creado dentro de la misma transacción que acepta una cotización, en relación uno a uno con la solicitud y vinculado a la cotización seleccionada. Su estado será `SCHEDULED`, `IN_PROGRESS`, `AWAITING_CONFIRMATION`, `COMPLETED` o `CANCELLED`.” — ADR-0002

> “`reviews`, en relación uno a uno con el servicio y vinculada al cliente y técnico participantes.” — ADR-0002

> “La API controlará estas carreras mediante transacciones PostgreSQL cortas con bloqueo pesimista de la fila que representa el agregado modificado y revalidación dentro de la transacción.” — ADR-0015

> “Para seleccionar una cotización, la transacción bloqueará la solicitud, comprobará propiedad y estado, validará que la cotización pertenece a esa solicitud y que su disponibilidad sigue en el futuro, marcará la elegida, cerrará las competidoras, actualizará la solicitud y creará el servicio.” — ADR-0015

> “Para avanzar, confirmar o cancelar un servicio, la transacción bloqueará el servicio y comprobará actor y transición permitida antes de actualizarlo.” — ADR-0015

> “Para crear una reseña, la transacción comprobará el servicio finalizado y se apoyará en la restricción única por servicio.” — ADR-0015

> “La cancelación será terminal y dependerá de la fase:” — ADR-0014

> “El cliente propietario puede cancelar una solicitud mientras está `PUBLISHED`.” — ADR-0014

> “Después de seleccionar una cotización, el cliente propietario o el técnico seleccionado pueden cancelar el servicio desde `SCHEDULED` o `IN_PROGRESS`.” — ADR-0014

> “En `AWAITING_CONFIRMATION`, solo el cliente propietario puede confirmar la finalización o cancelar el servicio.” — ADR-0014

> “`COMPLETED` y `CANCELLED` son estados terminales y no admiten cancelación ni reapertura.” — ADR-0014

> “Toda cancelación exigirá un motivo no vacío y registrará actor y fecha. Será un comando explícito de API sujeto a autorización y control de concurrencia.” — ADR-0014

> “`preferredAt`, `availableAt` y `scheduledAt` representarán instantes con fecha y hora. PostgreSQL los almacenará como `TIMESTAMPTZ`, normalizados a UTC, y OpenAPI los serializará como cadenas RFC 3339 con zona u offset explícito.” — ADR-0017

> “Al seleccionar una cotización, su `availableAt` inicializará `scheduledAt` del servicio.” — ADR-0017

> “Las restricciones críticas también existirán en PostgreSQL para que la corrección no dependa únicamente de comprobaciones previas en la aplicación.” — ADR-0007

These definitions lock the names, state members, terminal meanings, actor
matrix, cancellation fields and bounds, UTC interpretation, one-to-one
cardinality, and derived reputation direction. They do not lock the physical
names of new constraints and indexes, the names of any transition timestamp
columns hidden behind “timestamps de transición,” the exact mechanism for
review immutability, or whether the same-request invariant must use a
composite foreign key or API transaction validation.

The rating is explicitly an integer from 1 to 5; no `ReviewRating` enum is
defined by the inspected sources. A new rating enum would therefore be an
unapproved field/type invention.

### Affected Areas

- `apps/api/prisma/schema.prisma` — add the exact five-member `ServiceStatus`
  enum; add `Service` and `Review`; add restrictive forward relations and
  reverse relation fields on `Request`, `Quote`, `User`, and `ClientProfile`;
  preserve the locked absence of direct `technicianId` on `Service` and
  `Review` unless a superseding decision changes §5.1.
- `apps/api/prisma/migrations/20260901000003_services_reviews/migration.sql`
  — append migration #5 with the two new tables, enum, named primary keys,
  uniques, checks, indexes, and restrictive foreign keys. If the same-request
  composite-FK option is selected, this migration must also add the required
  unique target structure to `quotes` without rewriting migration #4.
- `apps/api/src/database/service-review-schema.spec.ts` — new `STATIC`
  contract for the two models, the exact enum members, required/optional
  fields, UTC mappings, restrictive relations, uniqueness, and directed
  indexes.
- `apps/api/src/database/service-review-migration.spec.ts` — new `STATIC`
  contract for migration #5, including exact tables and enum, rating and
  cancellation predicates, named one-to-one structures, restrictive FKs, no
  seed rows, and the selected immutability/cross-request enforcement shape.
- `apps/api/src/database/identity-schema.spec.ts` — update the compatibility
  model count from 10 to 12; preserve identity assertions.
- `apps/api/src/database/request-image-schema.spec.ts` — update the
  compatibility model count from 10 to 12; preserve request/image
  assertions.
- `apps/api/src/database/quote-schema.spec.ts` — update the compatibility
  model count from 10 to 12; preserve quote assertions and add no service
  behavior.
- `apps/api/prisma/migrations/migration_lock.toml`, prior migrations,
  `package.json`, `package-lock.json`, seeds, generated Prisma output, API
  modules, web code, and manifests — preserve; no dependency, seed, endpoint,
  or manifest change is required.

### Approaches

1. **Prisma enum, same-row integrity checks, and API-owned transitions** — use
   a PostgreSQL/Prisma `ServiceStatus` enum with exactly the locked states,
   default new services to `SCHEDULED`, enforce cancellation tuple
   consistency and rating bounds in PostgreSQL, and leave legal transitions,
   actor checks, completion eligibility, and future-date validation to later
   locked commands.
   - Pros: follows the existing request and quote enum precedent; generated
     types reject unknown states; same-row malformed cancellation data is
     rejected even outside the API; it does not duplicate #34–#38 commands.
   - Cons: the enum does not reject an illegal transition between known states;
     direct persistence can still bypass actor and phase rules; the live
     database gate remains unavailable.
   - Effort: Medium.

2. **Independent foreign keys plus API cross-row validation** — make
   `Service.requestId` and `Service.selectedQuoteId` separately restrictive,
   and rely on #31's request-row lock and same-request validation to prove that
   the selected quote belongs to the service request.
   - Pros: smallest migration; matches the already locked transaction rule;
     no alteration of the existing quote model or generated relation shape.
   - Cons: a direct database write can pair an existing request with an
     existing but unrelated quote; static contracts cannot prove the
     cross-row invariant; correction depends entirely on #31.
   - Effort: Low/Medium.

3. **Composite foreign key for the selected quote** — add a unique target on
   `quotes(id, request_id)` and have the service reference
   `(selected_quote_id, request_id)` to the quote, while retaining the unique
   request and selected-quote identities for the two one-to-one rules.
   - Pros: PostgreSQL rejects a mismatched request/quote pair at the storage
     boundary; it directly addresses the “when feasible” SQL requirement;
     #31's lock and revalidation remain necessary for concurrency and domain
     rules.
   - Cons: Prisma relation syntax and hand-authored migration SQL must stay in
     exact agreement; the extra composite unique is structurally redundant
     but required as a foreign-key target; it slightly extends the quote
     schema in migration #5.
   - Effort: Medium/High.

4. **Database-protected review immutability** — keep `Review` without an
   `updatedAt` field, expose no update/delete path in this change, and add a
   PostgreSQL trigger rejecting `UPDATE` and `DELETE` on reviews. The later
   #38 command still owns authorization, completion validation, locking, and
   insert conflict handling.
   - Pros: treats the locked “inmutable” rule as a database invariant; closes
     the gap left by an API-only promise; aligns with the existing role
     immutability trigger precedent.
   - Cons: adds manual PL/pgSQL not represented as a normal Prisma model;
     trigger behavior cannot be proved without PostgreSQL; privileged owners
     or disabled triggers remain outside ordinary constraint guarantees.
   - Effort: Medium.

### Boundary Analysis

**In scope:**

- `ServiceStatus` and `Review`/`Service` Prisma models with only the locked
  domain fields, defaults, requiredness, UUIDs, UTC mappings, and reverse
  relations.
- One service per request, one service per selected quote, and one review per
  service; restrictive references to `requests`, `quotes`, `users`, and
  `client_profiles`.
- `scheduledAt` as a required `TIMESTAMPTZ(6)` instant; no volatile database
  future-time predicate. The later selection transaction copies and
  revalidates quote availability.
- Named same-row cancellation checks: the service is `CANCELLED` exactly when
  `cancelledAt`, `cancelledByUserId`, and `cancellationReason` are all present;
  non-cancelled service states have none. The 10–500 reason bound is locked.
- Integer rating with a PostgreSQL 1–5 check, optional comment with a physical
  maximum of 1000 characters, and the selected immutability mechanism.
- Service indexes by status and creation, unique request/selected-quote/review
  structures, and only participant indexes justified by the normalized
  relation path. No `Service.technicianId` index is justified because the
  locked service row resolves the technician through the selected quote.
- Migration #5, offline static schema/migration contracts, compatibility
  model-count updates, Prisma validation/generation/diff review, and the
  carried-forward pending live gate.

**Out of scope:**

- Selection and service creation command #31; service reads #33; transitions
  #34–#36; cancellation command #37; review creation #38; and reputation
  calculation/read projection #39.
- Lock acquisition, actor/property/role authorization, completion checks,
  error mapping, conflict responses, retry behavior, and API DTOs. The
  persistence item records the indexes and constraints those commands need;
  it does not implement their behavior.
- Contact projection after selection (#32), phone exposure, OpenAPI, generated
  clients, web UI, auth, BFF behavior, seeds, catalog changes, payments, and
  money modeling already delivered by #8.
- Event history, audit log, automatic completion/cancellation, reopening,
  reassignment, dispute handling, notifications, and a duplicated technician
  reputation aggregate.
- Rewriting `TECH-DESIGN.md`, ADRs, canonical specs, `state.yaml`, prior
  migrations, `migration_lock.toml`, manifests, or generated output.

### Open Decisions

The following are implementation choices, not replacements for the locked
fields, state members, bounds, relationships, or actor matrix:

| Decision | Options | Recommendation |
|---|---|---|
| Service state representation | Prisma/PostgreSQL enum; text plus membership `CHECK`; transition triggers | Use `ServiceStatus` with exactly `SCHEDULED`, `IN_PROGRESS`, `AWAITING_CONFIRMATION`, `COMPLETED`, and `CANCELLED`. Use no transition triggers; later commands own the matrix under ADR-0015. |
| Initial service status | Explicit status in every #31 insert; database default `SCHEDULED`; nullable status | Use a database default of `SCHEDULED` and have #31 set it explicitly in the selection transaction. This matches the locked creation outcome but is an implementation choice. |
| Same-request quote integrity | Independent restrictive FKs plus #31 validation; composite FK through `(quote.id, quote.request_id)`; trigger | Prefer the composite FK if `prisma validate` and the migration diff support it cleanly. Otherwise use independent restrictive FKs and make #31's in-transaction equality check the authoritative rule; never claim the weaker shape proves equality by itself. |
| Service transition timestamps | `createdAt`/`updatedAt` only; explicitly named per-transition instants; append-only event table | The source says “timestamps de transición” but does not name columns. Prefer the established `createdAt`/`updatedAt` pair and do not invent `startedAt`, report, or confirmation columns; if per-transition audit is required, it needs a separate decision rather than silent field invention. |
| Review immutability mechanism | API-only no-update/delete surface and no `updatedAt`; rejecting `UPDATE`/`DELETE` trigger; database privilege revocation | Prefer a rejecting review trigger plus no `updatedAt` or mutation path, because “inmutable” is a durable invariant. If trigger SQL is rejected for MVP scope, select API-only explicitly and label database-level immutability unproved. |
| Review technician binding | Add direct `technicianId`; resolve technician through `review → service → selected quote`; no technician link | Keep the exact §5.1 fields: no direct `technicianId`. The technician is resolved through the selected quote as the service row requires. Treat ADR-0002's participant wording as a navigable relationship unless a superseding decision changes the locked row. |
| Review comment semantics | Nullable `VARCHAR(1000)` with no lower bound; blank rejected; blank normalized to `NULL` by #38 | Use nullable `String? @db.VarChar(1000)` with no invented minimum or whitespace bound. #38 may normalize blank input, but #9 must enforce only the locked optional/max-1000 rule. |
| Participant read indexes | Add direct service client/technician columns and indexes; join through request/selected quote; add only broad service status/creation index | Keep normalized joins. Unique `requestId` and `selectedQuoteId`, the existing quote technician-leading index, and `idx_services_status_created` support later reads. Do not add a service-technician index without a locked service technician field. |
| Migration name and physical names | Rewrite history; reset chain; append timestamped migration with named objects | Append `20260901000003_services_reviews`; preserve migrations #1–#4 and the provider lock. Freeze physical names in the proposal and static contracts. |

### Recommendation

Proceed to proposal with the normalized two-model approach. Add `Service`
with required `requestId`, `selectedQuoteId`, and `scheduledAt`, the exact
five-member `ServiceStatus` enum, cancellation fields, and established service
timestamps; add `Review` with required `serviceId`, required `clientId`, integer
rating, nullable bounded comment, and `createdAt` only. Use restrictive FKs,
unique request/selected-quote/review relationships, named cancellation and
rating checks, and a status/creation service index. Resolve the technician only
through the selected quote and derive reputation rather than storing an
average or a second technician binding.

Prefer a composite FK that makes `selectedQuoteId` and `requestId` agree, with
an additional unique target on the existing quote table if Prisma and the
hand-authored migration validate cleanly. Keep ADR-0015's request/service
locks and revalidation as later API obligations even with that database
defense. Prefer a database trigger rejecting review `UPDATE`/`DELETE`, while
retaining no `updatedAt` and no mutation path; if the proposal declines this
manual SQL, it must say that immutability is API-only rather than implying the
schema proves it.

The implementation boundary is migration #5 plus Prisma and offline static
contracts only. No endpoints, commands, reputation calculation, contact
projection, auth, OpenAPI, seeds, or transition implementation belongs here.

### Risks

- **Review immutability enforcement:** an API-only no-update convention is not
  a database guarantee; a trigger improves ordinary direct-write protection
  but remains manual SQL and cannot be demonstrated without a live database.
- **State enforcement split:** `ServiceStatus` rejects unknown values but not
  illegal known-to-known transitions. #34–#37 must lock the service row,
  revalidate actor and current state, and report conflicts; persistence must
  not pretend the enum enforces the matrix.
- **Cross-row quote mismatch:** two independent FKs allow a service to pair
  unrelated existing request and quote rows. A composite FK is stronger but
  requires an extra quote unique target and careful Prisma/migration alignment.
- **Review owner mismatch:** `clientId` can reference an existing client but
  cannot, without denormalizing the service or adding a trigger, prove that
  the client owns the service request. #38 must compare the locked service
  path and client identity inside its transaction.
- **Review race:** the unique `serviceId` index is the final insert race
  defense; static contracts cannot prove two concurrent #38 calls produce one
  row, and ADR-0015's service lock remains later work.
- **Normalization versus read cost:** reputation reads traverse
  `reviews → services → selected quote → technician`. The existing quote
  technician-leading index and unique service links support the path, but a
  future performance requirement must not silently add a duplicated
  `technicianId` field to this locked item.
- **Unspecified transition timestamps:** “timestamps de transición” does not
  name columns. Inventing per-state timestamps could create unowned API
  semantics; omitting an explicitly intended audit field could under-model the
  service. The proposal must record the interpretation.
- **UTC/future drift:** `scheduledAt` must be stored as UTC, but future-only
  validation belongs to the selection/creation commands. A volatile `NOW()`
  check would become stale and is not suitable for this persistence boundary.
- **Foreign-key stability:** new restrictive references depend on the existing
  `requests.id`, `quotes.id`/`request_id`, `users.id`, and
  `client_profiles.user_id` contracts. Renaming or recreating prior tables
  would invalidate migration #5 and downstream relation paths.
- **Offline evidence limit:** static schema and SQL text checks cannot prove
  PostgreSQL execution, trigger behavior, migration apply/re-apply/status,
  rollback, or concurrent selection/review behavior. The pending live gate
  must remain explicit.
- **Scope leakage:** implementing #31 or #33–#39 here would duplicate later
  API ownership and make the migration appear to provide authorization,
  transitions, review eligibility, or reputation calculation that it cannot
  provide.

### Ready for Proposal

Yes. The locked service/review fields, relations, five service states,
terminal rules, cancellation actors and bounds, review rating/comment limits,
UTC storage, one-to-one cardinalities, downstream ownership, migration order,
and offline evidence boundary are sufficiently identified for proposal work.
The proposal must freeze the genuinely open implementation choices—especially
same-request composite-FK feasibility, review immutability enforcement,
transition-timestamp interpretation, nullable comment semantics, and physical
object names—without presenting any of them as source-locked facts.
