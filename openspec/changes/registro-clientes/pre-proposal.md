# Pre-Proposal State — gentle-ai.sdd-preproposal/v1

- revision: 1
- status: confirmed
- exploration: `openspec/changes/registro-clientes/exploration.md`
- research: unselected
- proposal_ready: true
- confirmed_by: orchestrator (auto mode mandate 2026-09-01 — recommended options auto-selected)

## Confirmed product decisions

| # | Decision | Confirmed value |
|---|----------|-----------------|
| 1 | auth_creation_order | `bff-supabase-first-deferred-adapter` — Supabase/BFF own signup+verification (outside this change, outside the transaction); API onboarding invoked ONLY with verified trusted identity; real provider adapter DEFERRED until Supabase gate + #13; explicit injectable port + fake adapter now |
| 2 | api_route | `POST /api/v1/onboarding/client` — verified-onboarding semantics (API never owns password signup per ADR-0006/0011) |
| 3 | identity_context | `adapter-produced-trusted` — port produces `{authSubject, email, emailVerified}`; NEVER accepted from untrusted body; unverified identity → no domain creation (401/403 per frozen codes — 401 AUTHENTICATION_REQUIRED for unverified context) |
| 4 | email_normalization | `api-boundary-shared-rule` — trim + locale-independent lowercase, frozen in spec; used for duplicate checks + users.email copy; no provider-specific rewriting (no Gmail dot/plus) |
| 5 | duplicate_detection | `pre-read-plus-unique-constraint` — friendly pre-read + DB unique as race-safe final defense; targeted email P2002 → generic 409 CONFLICT (never provider/DB text); different-user-same-email → 409 |
| 6 | district_validation | `transactional-active-check` — inside the transaction: validate districtId exists AND active=true (short FOR SHARE row lock); missing/inactive → 422 SEMANTIC_INVALID with fieldErrors.districtId; FK remains existence defense |
| 7 | transaction_shape | `explicit-short-prisma-transaction` — ONE $transaction: identity reconciliation → active-district revalidation → User create (role CLIENT) + nested ClientProfile create; NO network calls inside; profile failure rolls back user |
| 8 | auth_env_values | `defer-all-provider-config` — NO env schema change this slice; AUTH_ISSUER_URL/AUTH_JWKS_URL stay documented-future; no invented admin secrets |
| 9 | idempotency_response | `201-create-200-reconcile` — first onboarding → 201 with sanitized projection; same verified subject retry (§8.1 idempotent rule) → 200 with existing projection (no duplicate rows); 409 reserved for different-user-same-email |
| 10 | work_unit_scope | `client-only-slice` — client onboarding ONLY; technician onboarding NOT silently added (no technician fields/specialties here); technician gap noted for the item that owns it |

## Locked constraints (binding, verbatim from TECH-DESIGN §3.3/§5.3/§7.1/§7.2/§8.1/§11 + ADR-0006/0011/0018)

- Supabase Auth manages credentials/sessions/recovery/tokens; app DB stores role+profile only; API never authorizes from client-editable metadata (ADR-0006).
- users.email = query copy synchronized at session establishment; identity/verification/email-changes resolve in Supabase Auth (TD §5.3).
- After first verified session, API creates users idempotently with role chosen ONCE (TD §8.1).
- NestJS API receives server-to-server tokens only (TD §7.2). Transactions contain NO network calls or file processing (TD §11).
- client_profiles reference ACTIVE districts via FK (ADR-0018). 409 = incompatible state/concurrency (TD §7.1).
- Persistence boundary (from #5): users unique email + authSubject; role triggers; E.164 phone; name 2-100; RESTRICT FKs.

## Capability impact (binding)

NEW capability `client-onboarding` (verified onboarding endpoint, transactional user+profile creation, duplicate/district semantics, auth port seam, contract surface). No modifications to existing capabilities. Contract artifacts regenerate (openapi.json + generated client — additive v1 change per compatibility rule).

## Scope boundary (binding)

IN: registration module (controller/service/DTOs + auth port interface + fake adapter), POST /api/v1/onboarding/client, one short transaction (reconciliation + active-district revalidation + user+profile create), P2002→409 mapping, 422 district field errors, idempotent same-subject reconcile, sanitized projection, OpenAPI/client regeneration + contract gates, offline unit + inject tests (fake Prisma + fake identity port). OUT: web forms/BFF (#13+), login/session/JWT (#13), profile editing (#14/#15), email verification UX, live Supabase (pending gate), technician onboarding (separate ownership), password storage (never), env schema changes, Prisma schema changes.

## Carried forward (binding)

Live PostgreSQL gate (migrations #1–#5 + seed + triggers — registration transaction/rollback/lock behavior provable only live) remains UNSATISFIED. Supabase project provisioning pending. Offline evidence = fake-client orchestration only; MUST NOT claim provider/DB acceptance.
