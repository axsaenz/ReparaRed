## Exploration: BACKLOG.md item #8 — Persist quotes

### Current State

The request aggregate already exists in `apps/api/prisma/schema.prisma`; there is no `Quote` model, quote status enum, quote table, quote index, or quote persistence contract. The actual schema declares nine models and three enums: `UserRole`, `RequestStatus`, and `UploadReservationStatus`. The supplied shorthand says “9 models + 2 enums”, but the checked-in schema and migration #3 clearly contain the third enum, so this exploration follows the files.

Migration history is an empty baseline (`00000000000000_baseline`), identity/profiles (`20260901000000_identity_profiles`), and requests/images (`20260901000001_requests_images`). The PostgreSQL provider lock is unchanged. Migration #3 establishes hand-authored named checks, unique indexes, directed indexes, `ON DELETE RESTRICT ON UPDATE CASCADE` foreign keys, and zero seed rows. Existing offline Vitest contracts read the schema and migration text; `identity-schema.spec.ts` and `request-image-schema.spec.ts` both currently assert nine models. Prisma and `@prisma/client` are already pinned at `6.19.3`, so this model-only change needs no dependency or manifest change.

The prior live migration gate remains unavailable. Item #8 must carry forward the `UNSATISFIED / RECORDED PENDING` apply → re-apply → status limitation for the existing history and extend it to migration #4 when verification is performed; static checks must not be represented as executed PostgreSQL proof. `openspec/config.yaml` still describes the repository as planning-only despite the implemented workspace; that unrelated metadata mismatch must not be corrected here.

#### Locked definitions from the approved sources

The quote entity row is binding and is quoted verbatim:

> “`quotes` | `id`, `requestId`, `technicianId`, `amount`, `currency`, `description`, `availableAt`, `status`, timestamps | Única por solicitud+técnico; `NUMERIC(8,2)` entre `0.01` y `999999.99`; moneda `PEN`; descripción 10–1000; índice por técnico y creación |” — `TECH-DESIGN.md` §5.1

Therefore `technicianId` is required, not nullable: the approved relationship is `requests 1---* quotes *---1 technician_profiles`. The foreign key must target `requests.id` and `technician_profiles.user_id`, both restrictively, rather than targeting `users.id` directly. Domain IDs remain opaque, and quote timestamps follow the established `createdAt`/`updatedAt` UTC convention.

The quote state set and terminal states are also binding:

> “`SUBMITTED` | El técnico propietario puede editar o retirar mientras la solicitud siga `PUBLISHED`; el cliente puede seleccionarla” — `TECH-DESIGN.md` §6.2

> “`WITHDRAWN` | El técnico puede editar y volver a enviar la misma cotización mientras la solicitud siga `PUBLISHED`” — `TECH-DESIGN.md` §6.2

> “`SELECTED` | Terminal; se vincula al servicio” — `TECH-DESIGN.md` §6.2

> “`CLOSED` | Terminal; otra propuesta fue elegida o la solicitud fue cancelada” — `TECH-DESIGN.md` §6.2

> “La selección bloquea la solicitud, marca una cotización `SELECTED`, marca las demás `CLOSED`, cambia la solicitud a `ASSIGNED` y crea el servicio.” — `TECH-DESIGN.md` §6.2

Request cancellation has the downstream quote-closing rule:

> “`PUBLISHED` | Cancelar | Cliente propietario | `CANCELLED` | Motivo válido; cierra cotizaciones activas” — `TECH-DESIGN.md` §6.1

These selection and cancellation effects belong to #31 and #23, not to this persistence item. #8 must persist the closed state set, but must not implement transition commands or triggers for those workflows. No `selectedAt`, `closedAt`, or other transition-instant field is present in the locked quote row; adding one would be scope expansion.

Money and availability are resolved by accepted ADRs rather than open choices:

> “Cada cotización almacenará un monto decimal de precisión fija y un código de moneda ISO 4217. El MVP admitirá únicamente `PEN`, validado tanto por la API como por una restricción de base de datos, y exigirá un monto mayor que cero.” — ADR-0016

> “PostgreSQL usará un tipo `NUMERIC` con escala de dos decimales adecuada para el rango definido por el producto.” — ADR-0016

The entity row fixes that product range as `NUMERIC(8,2)`, `0.01` through `999999.99`, and fixes the currency value as `PEN`. The Prisma representation must therefore use `Decimal @db.Decimal(8, 2)`; binary `Float`/JavaScript `number` storage is forbidden.

> “`preferredAt`, `availableAt` y `scheduledAt` representarán instantes con fecha y hora. PostgreSQL los almacenará como `TIMESTAMPTZ`, normalizados a UTC” — ADR-0017

ADR-0017 assigns future validation to the API when creating a quote and again when selecting it. `availableAt` is required by the entity row, but a volatile database `NOW()` check is not part of this persistence item. It may differ from `Request.preferredAt`; on later selection it initializes the service schedule.

Concurrency is likewise already decided for later commands:

> “La API controlará estas carreras mediante transacciones PostgreSQL cortas con bloqueo pesimista de la fila que representa el agregado modificado y revalidación dentro de la transacción.” — ADR-0015

> “Para crear una cotización, la transacción bloqueará la solicitud, comprobará que sigue `PUBLISHED` y que el técnico conserva la especialidad requerida, y luego insertará la propuesta.” — ADR-0015

The database unique rule is the final defense; the later API must not rely on a pre-read alone. Re-send/edit semantics are supported by updating the same row, preserving the unique `(request_id, technician_id)` pair and changing `updatedAt`.

The genuine source gaps are limited: the physical type for `currency`, the initial database default for `status`, the exact whitespace treatment for the description check, and the physical names/order of quote indexes are not explicitly frozen. The state members, terminal meaning, money precision/range, currency value, availability instant, relationship targets, and pairwise uniqueness are not open decisions.

### Affected Areas

- `apps/api/prisma/schema.prisma` — add `QuoteStatus` with exactly `SUBMITTED`, `WITHDRAWN`, `SELECTED`, and `CLOSED`; add `Quote` with the locked fields, `Decimal(8,2)` amount, mapped snake_case names, required `availableAt` `Timestamptz(6)`, restrictive relations, the pairwise unique declaration, and quote indexes. Extend `Request` and `TechnicianProfile` with reverse relations.
- `apps/api/prisma/migrations/20260901000002_quotes/migration.sql` — add migration #4 after the three existing migrations. It should contain the quote enum/table, named primary key, amount/currency/description checks, named unique and read indexes, and two restrictive foreign keys with `ON UPDATE CASCADE`. It must contain no seed rows, endpoints, triggers, or service logic.
- `apps/api/src/database/quote-schema.spec.ts` — add `STATIC` assertions for the model, exact state members, Decimal mapping, required/UTC fields, physical mappings, relations, uniqueness, and read indexes.
- `apps/api/src/database/quote-migration.spec.ts` — add `STATIC` assertions for migration #4’s enum, table, numeric/bound predicates, named indexes, restrictive foreign keys, and absence of inserts or sensitive literals.
- `apps/api/src/database/identity-schema.spec.ts` and `apps/api/src/database/request-image-schema.spec.ts` — update their compatibility model-count assertions from nine to ten when `Quote` is added; preserve their existing contracts.
- `apps/api/prisma/migrations/migration_lock.toml`, prior migrations, package manifests, seeds, runtime lifecycle, and generated Prisma output — verify or preserve only; no changes are required.

### Approaches

The approaches below keep every locked field, state member, bound, relationship, and uniqueness rule unchanged.

1. **Prisma enum with explicit persistence checks and API-owned transitions** — represent the closed `QuoteStatus` set as a Prisma/PostgreSQL enum, map money to `Decimal @db.Decimal(8, 2)`, enforce fixed product bounds and `PEN` in PostgreSQL, and leave legal transitions, future availability, selection, and cancellation effects to later API transactions.
   - Pros: follows the established #5/#7 enum precedent and ADR-0007; gives generated type safety; preserves the persistence-only boundary; keeps direct database writes from introducing unknown states.
   - Cons: enum additions require a migration; an enum still does not prevent an illegal transition between known values.
   - Effort: Medium.

2. **Text status with membership check and transition triggers** — store the same four states as text, add a membership check, and optionally add PostgreSQL triggers for legal transitions.
   - Pros: future state additions can avoid an enum alteration; triggers could reject some direct illegal transitions.
   - Cons: departs from the existing closed-set precedent; adds manual SQL and harder offline proof; duplicates API locking and would pull #23/#28/#31 behavior into #8.
   - Effort: Medium/High.

The first approach is the only recommended lifecycle approach. Currency type and index coverage remain implementation-level decisions and are recorded below rather than treated as alternatives to the locked money contract.

### Boundary Analysis

**In scope:**

- The `Quote` model, `QuoteStatus` enum, reverse relations, field mappings, requiredness, UTC timestamps, and Prisma `Decimal(8,2)` mapping.
- Named PostgreSQL checks for the locked amount range, `PEN`, and description length; named unique `(request_id, technician_id)` index; indexes for technician quote lists and request quote comparison.
- Restrictive quote-to-request and quote-to-technician-profile foreign keys, migration #4, and preservation of the existing migration order/provider lock.
- Offline static schema/migration contracts, Prisma validation/generation/diff evidence, model-count compatibility updates, and the carried-forward recorded pending live gate.

**Out of scope:**

- Sending/creating quote endpoints and lock-and-revalidate behavior (#28), technician edit/withdraw/resubmit commands and list endpoint behavior (#29), comparison projections (#30), selection/service creation (#31), and post-selection contact projections (#32).
- Closing active quotes during request cancellation (#23), service/review persistence (#9), service state changes, and any transition trigger or job.
- Future-date command validation, auth, role/ownership/specialty checks, OpenAPI, generated API client, web UI, money display/localization, payment processing, and seed data.
- Changing `TECH-DESIGN.md`, ADRs, canonical specs, `state.yaml`, manifests, prior migrations, or `migration_lock.toml`.

### Open Decisions

| Decision | Options | Recommendation |
|---|---|---|
| Quote status representation | Prisma/PostgreSQL enum; text plus membership `CHECK`; text plus transition triggers | Use a `QuoteStatus` enum with exactly the four locked members. Do not add transition triggers; later API commands own transition validation under ADR-0015. |
| Initial persisted status | Explicit status in every insert; database default `SUBMITTED`; nullable status | Freeze `SUBMITTED` as the database default during proposal, matching the creation semantics of #28. This is a recommended implementation choice, not a source quote. |
| Currency physical representation | `VARCHAR(3)` plus `CHECK = 'PEN'`; `CHAR(3)` plus check; Prisma enum containing `PEN` | Use `String @db.VarChar(3)` with a named `quotes_currency_check`. This preserves the ISO-code field described by ADR-0016 while making the database restriction explicit and leaving future currencies to a later decision. |
| Description check semantics | API-only; raw `char_length`; trimmed `char_length(trim(description))` | Follow the established #5/#7 persistence pattern: `VARCHAR(1000)` plus a named trimmed 10–1000 check. The bounds are locked; the trim predicate is the implementation choice. |
| Quote read indexes | Unique pair only; technician/created index only; technician/created plus request/created indexes | Add `idx_quotes_technician_created` on `(technician_id ASC, created_at DESC, id ASC)` for #29 and `idx_quotes_request_created` on `(request_id ASC, created_at DESC, id ASC)` for #30. Retain the named pairwise unique index separately. The `id` tie-breaker matches the stable-list convention. |
| Future availability enforcement | Database `NOW()` check; API create/selection validation; trigger | Use the locked API validation split. Persist `available_at` as `TIMESTAMPTZ(6)` without a volatile future check; #31 must revalidate it under its request lock. |
| State-associated instants | Add `selectedAt`/`closedAt`; use only locked timestamps; add an audit table | Use only `createdAt` and `updatedAt`. No selected/closed instant or event history is locked for #8, so do not add one. |
| Migration naming | New timestamp/slug; rewrite prior history; reset migration chain | Add the next ordered migration, recommended as `20260901000002_quotes`; never rewrite #1–#3 or reset the provider lock. |

### Offline-Verifiable Evidence

Static contracts can prove the intended text and declarative shape: ten models after the addition, the exact four enum members, mapped columns, required Decimal/UTC fields, named checks, unique/index declarations, restrictive FK actions, and no seed or sensitive literals. `prisma validate`, `prisma generate`, and a from-empty migration diff can additionally prove Prisma syntax and the generated declarative portion.

These checks cannot prove that PostgreSQL executes the checks, enum, unique index, or FKs; they cannot prove migration apply/re-apply/status, rollback, pooler compatibility, or concurrent insertion/selection behavior. The implementation and verification records must keep the live migration gate explicitly `UNSATISFIED / RECORDED PENDING` until disposable PostgreSQL is available.

### Recommendation

Proceed with Approach 1. Add one normalized `quotes` table in migration #4 with opaque UUID `id`, required `requestId` and `technicianId`, `amount Decimal @db.Decimal(8, 2)`, `currency VARCHAR(3)` constrained to `PEN`, bounded description, required `availableAt TIMESTAMPTZ(6)`, `QuoteStatus` defaulting to the recommended `SUBMITTED`, and `createdAt`/`updatedAt` timestamps. Use named restrictive FKs to `requests.id` and `technician_profiles.user_id`, a named unique index on `(request_id, technician_id)`, and the two targeted later-read indexes.

Do not store money as floating point, add transition timestamps, enforce future availability with a volatile database check, or implement quote/request/service commands. The unique index supplies the database race defense; ADR-0015’s request-row lock and revalidation remain the responsibility of #28 and #31. The proposal should freeze the recommended currency type, initial default, check predicates, index names/order, and migration name while explicitly marking them as implementation choices where the approved sources are silent.

### Risks

- **Decimal coercion:** `NUMERIC(8,2)` prevents binary floating-point storage but does not replace input grammar validation; later API code must reject excess fractional precision before PostgreSQL can round it.
- **Uniqueness races:** a pre-read can race under concurrent quote creation. The named database unique index is mandatory, and #28 must combine it with the request-row lock and conflict handling required by ADR-0015.
- **State enforcement split:** the enum rejects unknown values but not arbitrary transitions among known values. Transition legality remains API-owned; a future trigger would expand scope and require stronger live evidence.
- **Availability drift:** a future `availableAt` can become past after submission. No static or row check should pretend to solve this; #31 must revalidate inside its transaction.
- **Currency and status defaults:** their physical type and initial default are not explicitly frozen by the design documents. The proposal must record the recommendation without attributing it to a locked source.
- **Index coverage:** the unique pair index helps request filtering but not request-plus-creation ordering; omitting the targeted request index could make #30 reads less predictable or efficient.
- **Referential stability:** the quote FK depends on the existing `requests.id` and `technician_profiles.user_id` contracts. Recreating or renaming either prior table would break migration #4 and downstream relations.
- **Manual migration drift:** named checks and index order may not be emitted exactly by Prisma’s diff. Migration text, static tests, and declarative diff review must remain aligned.
- **Offline proof limit:** no current disposable PostgreSQL exists, so static passing results cannot be reported as executed SQL or concurrency proof. The pending gate must remain explicit.
- **Scope leakage:** implementing cancel/selection transitions, service creation, endpoints, projections, or OpenAPI here would duplicate later backlog ownership and exceed item #8.

### Ready for Proposal

Yes. The quote fields, states, terminal meanings, money precision/range, PEN rule, UTC availability, FK targets, uniqueness semantics, downstream transition ownership, migration boundary, static evidence pattern, and pending live gate are sufficiently clear for proposal work. The proposal should freeze only the identified implementation choices and preserve the strict persistence-only boundary.
