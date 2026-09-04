## Exploration: BACKLOG.md item #14 — Edit client profile

### Current State

The repository has an implemented NestJS/Fastify API, despite the stale OpenSpec context describing the workspace as planning-only. `createApp()` applies the `/api/v1` prefix and the global problem-details filter. `AuthGuard` strictly extracts a Bearer token, verifies it through the configured JWKS verifier, and attaches a request-scoped `trustedIdentity`; `@CurrentIdentity()` reads that principal. The explicit `identityPort` test seam selects `OfflineAuthGuard`, while production configuration without a verifier fails closed. The principal contains subject, email, and verification state, but deliberately does not contain a role.

The API currently has catalog reads and `POST /api/v1/onboarding/client`; it has no `/me/*` endpoint. Registration creates a complete `User` plus `ClientProfile` atomically, validates the selected district with a parameterized `FOR SHARE` query inside the transaction, and returns an allowlisted profile projection. Its parser accepts exactly `name`, `phone`, and `districtId`, but the current onboarding path does not trim the persisted name. The identity migration makes `client_profiles` columns required, keeps the relation optional at the `User` level, and installs `client_profiles_role_match` on insert and update. Registration explicitly supports a `CLIENT` user that exists without a profile, so that partial state is representable even though a successful onboarding normally completes it.

The OpenAPI exporter and generated client are active. `apps/api/openapi.json` and `packages/api-client/src/generated.ts` currently contain the onboarding and catalog surface but no `/api/v1/me/profile` path. Contract freshness, validation, compatibility, and workspace typecheck are orchestrated by the root `scripts/contract.mjs` pipeline. Existing API tests use Vitest, fake Prisma transaction callbacks, and Fastify `inject()`; the archived session change records valid RSA/JWKS fixtures and guarded-route coverage. There is no live PostgreSQL or provider evidence in this repository.

The web has the session BFF, `withBearer`, and a transport-only generated client, but no profile page or profile-specific Route Handler. Under ADR-0011, a profile BFF adapter belongs with the web consumer, not with this API-first change.

#### Locked decisions from the technical design and ADRs

These decisions are binding and should not be re-decided by the proposal:

> “GET/PATCH /me/profile para el perfil del usuario autenticado.” — `TECH-DESIGN.md` §7.2

> “El correo almacenado en `users` es una copia de consulta sincronizada al establecer sesión; identidad, verificación y cambios de correo se resuelven desde Supabase Auth.” — `TECH-DESIGN.md` §5.3

> “La API no confiará para autorizar en metadatos editables enviados por el cliente.” — ADR-0006

> “La API se organizará en módulos por capacidad de negocio, como identidad y perfiles” and “los servicios de aplicación coordinarán reglas y transacciones.” — ADR-0005

> “La API controlará estas carreras mediante transacciones PostgreSQL cortas con bloqueo pesimista de la fila que representa el agregado modificado y revalidación dentro de la transacción.” — ADR-0015

> “Las transacciones no contienen llamadas de red ni procesamiento de archivos.” — `TECH-DESIGN.md` §11

> “client_profiles y requests referenciarán un distrito activo mediante clave foránea” — ADR-0018

The sources lock the `PATCH` method and the editable fields, but do not lock whether a PATCH body is partial or a complete replacement. They also do not explicitly choose the status for an absent self-profile. Those are the material proposal decisions below.

### Affected Areas

- `apps/api/src/profiles/` — add a capability-oriented `ProfilesModule`, controller, service, and client-profile DTOs. The module should own `GET /me/profile` and `PATCH /me/profile`; it should not be folded into onboarding merely because both operations touch `ClientProfile`.
- `apps/api/src/auth/auth.module.ts`, `apps/api/src/app.module.ts`, and `apps/api/src/app.factory.ts` — make the new module consume the existing `AuthGuard` and `@CurrentIdentity()` seam in both runtime and offline test wiring. Do not add a role claim or trust a body identity.
- `apps/api/src/registration/` validation/projection helpers — reuse or extract the existing name, phone, UUID, and allowlisted projection rules so onboarding and editing do not drift. Editing must trim the final name before persistence; the current onboarding parser is a sibling behavior that may need a narrowly scoped shared helper review.
- `apps/api/src/database/` and `apps/api/prisma/schema.prisma` — no model migration is expected. The existing required `ClientProfile` fields, district foreign key, restrictive relations, role-match trigger, and `updatedAt` support the update. The implementation must update only the authenticated user's client profile and never `User.email` or `User.role`.
- `apps/api/src/common/errors/` — use the existing `application/problem+json` filter and stable mappings. Malformed shape, unknown fields, invalid types, and invalid profile values follow the established 400 input path; an inactive or missing selected district is a 422 field error; role mismatch is 403; missing self-profile is the selected 404 recommendation below; dependency failures should be mapped safely to 503 and unexpected failures to 500.
- `apps/api/openapi.json` and `packages/api-client/src/generated.ts` — regenerate the additive `/api/v1/me/profile` GET/PATCH operations, request/response schemas, security metadata if emitted, and declared problem responses. Contract export, generation, validation, freshness, compatibility, and client typecheck must run together.
- `apps/api/src/profiles/*.spec.ts` and related integration/contract assertions — add fake-Prisma transaction tests and guarded Fastify injection tests for authenticated client success, GET projection, partial PATCH merge, trimming, invalid input, inactive district, technician denial, absent profile, rollback, and sensitive-field omission. The valid-token guard fixture pattern from #13 should be reused; no live JWKS or PostgreSQL claim is justified offline.
- `apps/web/src/` — no changes in this item. The existing `withBearer` helper is a usable future seam, but a fixed profile BFF adapter and UI should be delivered with the later web profile consumer rather than adding an unused route now.

#### Boundary analysis

**In scope:** the guarded API endpoint pair, client-role authorization from persisted `User.role`, owner-only self resolution from the verified subject, name/phone/district validation and normalization, transactional profile persistence, active-district revalidation, safe errors, OpenAPI/generated-client regeneration, and API tests.

**Out of scope:** web UI and responsive behavior, a profile BFF Route Handler, technician profile editing (#15), email or password changes through Supabase Auth, role changes, catalog endpoints or catalog administration, login/session flows, and any new database entity or migration.

The endpoint is self-scoped: there is no user-supplied profile or user identifier to authorize. A `TECHNICIAN` token reaching this client profile route should receive 403 because the authenticated actor is known and the operation is forbidden by role. The API must still load that role from the database rather than from JWT metadata.

### Approaches

1. **New profiles module with partial PATCH and final-state validation (recommended)** — add a `ProfilesModule` beside `RegistrationModule`. `GET` returns the authenticated user's client profile. `PATCH` accepts one or more of `name`, `phone`, and `districtId`; it rejects unknown keys and an empty body, locks and rereads the current profile, merges supplied fields, normalizes the final name, validates the complete resulting profile, revalidates a supplied district as active, and updates the row in one short transaction.
   - Pros: follows the locked `/me/profile` surface and ADR-0005's capability modules; supports independent field edits; preserves omitted values; avoids re-selecting an unchanged district that may later be deactivated; gives #15 a clear parallel module/service pattern.
   - Cons: requires presence-aware parsing and shared validation extraction; OpenAPI must mark PATCH properties optional while documenting the resulting complete response; row-lock intent needs a fake test and later live PostgreSQL evidence.
   - Effort: Medium.

2. **Extend `RegistrationModule` with a complete-profile PATCH** — reuse the onboarding DTO, projection, and service, require all three fields on every edit, and perform a transactional replacement of the existing profile.
   - Pros: smaller initial module graph and straightforward complete-profile validation; existing district-lock and projection code can be reused directly.
   - Cons: couples lifecycle creation to ongoing profile management; makes partial field edits and the technician parallel slice less clear; forces name-only changes to resubmit all fields and can reject a preserved district that has since been deactivated; risks widening the registration service beyond its onboarding contract.
   - Effort: Medium.

3. **Change the planned operation to PUT/full replacement** — expose a full replacement document rather than the planned PATCH operation.
   - Pros: explicit replacement semantics and simple persistence mapping.
   - Cons: contradicts the quoted locked §7.2 surface; requires a technical-design/contract decision before implementation; gives no benefit over a complete PATCH for this MVP.
   - Effort: High because it is an architecture/contract change.

#### Transaction and error choices

The recommended transaction should resolve the trusted subject to a domain user, verify persisted role `CLIENT`, lock the `client_profiles` row with parameterized `FOR UPDATE`, reread the profile after the lock, merge and validate the final values, lock a newly selected district with `active = true FOR SHARE`, and update the profile. The implementation must document one consistent lock order and keep network calls outside the transaction. If no domain user or client profile exists, it must not create one as a side effect of an edit operation.

For an absent profile, **404 `NOT_FOUND` is recommended for both GET and PATCH**: the target self-resource does not exist, and the operation is not an onboarding/reconciliation command. This applies to both an Auth subject with no domain user and the representable `CLIENT` user-without-profile state, with a generic body and no identity details. **409 `CONFLICT` remains appropriate only if the implementation introduces an explicit concurrent/state-conflict condition**; it should not be used merely to signal a missing row. Choosing 409 instead would make the incomplete-domain state a new public contract and would require a repair/reconciliation action to be specified.

The PATCH contract should be partial, but validation applies to the complete post-merge profile: `name` is trimmed and 2–100 characters, `phone` matches the existing E.164 rule (`+` followed by a non-zero digit and 7–14 further digits), and a supplied `districtId` is a UUID for an active district. `email`, `authSubject`, `role`, and arbitrary fields are rejected rather than ignored. Invalid JSON shape, missing/unknown fields, wrong types, malformed UUID, and invalid textual/phone bounds map to 400 under the current parser convention; an inactive or nonexistent district maps to 422 with stable `fieldErrors.districtId`. Both successful GET and PATCH should return the direct profile object `{ name, phone, districtId }`; no internal user ID, subject, email, or persistence metadata is exposed.

### Recommendation

Proceed with a proposal for a new `ProfilesModule` implementing `GET /api/v1/me/profile` and the locked `PATCH /api/v1/me/profile`. Use the existing guard/decorator seam, load role and profile ownership from PostgreSQL, and recommend a presence-aware partial PATCH whose merged final state is validated and persisted after a `FOR UPDATE` profile lock and an in-transaction `FOR SHARE` active-district check. Return 403 for authenticated technicians, 404 for an absent self-profile, and 422 only for an invalid selected district; do not add a create/reconcile behavior, email editing, BFF adapter, UI, or migration.

Reuse the existing `ClientProfileResponseDto` shape for the direct GET/PATCH response, extract shared validation only as needed, and regenerate both committed contract artifacts. Treat live PostgreSQL lock/trigger behavior, live JWT/provider behavior, deployment, and the future web consumer as pending evidence rather than claiming them from fake-client tests.

### Risks

- **First guarded domain endpoint:** module wiring can accidentally bypass `AuthGuard`, use the offline identity port in runtime, or accept a body-supplied subject. Add an HTTP test for missing/malformed token and a valid principal that differs from body data.
- **Role boundary:** the JWT principal has no role by design. A technician must not reach client-profile data or mutate it; authorization must use the persisted role and return a safe 403.
- **Partial-state ambiguity:** the schema permits a `CLIENT` without a `ClientProfile` because the relation is optional and onboarding reconciles partial users. The 404 decision must be frozen before the contract is generated; the edit endpoint must not silently create a profile.
- **Validation drift:** onboarding currently checks name length but does not trim the stored name. Shared helpers or explicit tests are needed to ensure edit persistence trims names without changing unrelated onboarding semantics accidentally.
- **District deactivation race:** a pre-read is insufficient. The selected district must be revalidated and locked inside the same transaction; live PostgreSQL proof remains pending, and a catalog-admin writer is not currently present to exercise the race.
- **Lost updates:** ADR-0015 requires pessimistic aggregate locking, but there is no version/If-Match contract. Concurrent edits will serialize and the last committed valid update may win unless a new optimistic-concurrency decision is added.
- **Contract churn:** adding GET/PATCH and optional request properties changes both OpenAPI and the generated TypeScript client. Stale artifacts or an accidental breaking response shape will fail the existing contract gates.
- **BFF scope creep:** adding a profile Route Handler or UI now would duplicate a future consumer's work and expand this API change beyond the backlog boundary.
- **Offline evidence limits:** fake Prisma transactions cannot prove PostgreSQL row locks, triggers, foreign keys, isolation, or rollback; valid JWKS fixtures cannot prove live Supabase claim compatibility or deployment behavior.

### Ready for Proposal

Yes. The API seam, persisted authorization source, schema constraints, lock pattern, contract pipeline, testing pattern, and boundary are sufficiently clear. The proposal should freeze partial PATCH semantics, the 404 absent-profile rule, the exact success response/envelope, lock order, and whether dependency failures are declared as 503 responses before handing the change to specification and design.
