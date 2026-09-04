# Pre-Proposal State — gentle-ai.sdd-preproposal/v1

- revision: 1
- status: confirmed
- exploration: `openspec/changes/perfil-cliente/exploration.md`
- research: unselected
- proposal_ready: true
- confirmed_by: orchestrator (auto mode mandate 2026-09-01 — recommended options auto-selected)

## Confirmed product decisions

| # | Decision | Confirmed value |
|---|----------|-----------------|
| 1 | http_method | `patch-partial` — PATCH /api/v1/me/profile with partial updates (only provided fields change); response = full updated sanitized projection |
| 2 | module_placement | `new-profiles-module` — `apps/api/src/profiles/` (reusable base for #15 technician editing) |
| 3 | transaction_shape | `lock-profile-plus-district-revalidate` — short transaction: lock own profile row, revalidate district active (FOR SHARE pattern from registration) when districtId provided, update, commit |
| 4 | authorization | `owner-only-role-checked` — guard principal required (401 unauthenticated); non-CLIENT roles → 403 FORBIDDEN; client edits OWN profile only (identity-derived, never body-supplied userId) |
| 5 | missing_profile | `404-not-found` — authenticated CLIENT without profile row → 404 NOT_FOUND (safe problem; the state is rare but modelable) |
| 6 | contract_surface | `patch-only-plus-gap-note` — #14 ships PATCH /api/v1/me/profile only (strict item scope); GET /me/profile ownership gap RECORDED for orchestrator review (likely lands with #15 or the profile UI item; TD §7.2 lists /me/profile as planned surface) |
| 7 | editable_fields | `name-phone-district` — exactly the three locked fields; email NEVER editable via API (Supabase Auth owns per TD §5.3); role immutable; validation = persistence bounds (name 2-100 trimmed, phone E.164, district active) |
| 8 | bff_adapter | `deferred-to-ui-consumer` — web BFF adapter for profile editing lands with the UI item that consumes it (web has no profile UI yet); #14 = API endpoint + contract only |

## Locked constraints (binding)

- /me/profile is planned API surface (TD §7.2). Editable: name/phone/district with the persistence bounds from #5 (client_profiles checks). Email changes resolve via Supabase Auth (TD §5.3). Role immutable (TD §8.1). Active-district FK (ADR-0018). Short transactions + row locks per ADR-0015. Error codes frozen (401/403/404/400/422/500). Problem+json envelope. Contract regeneration additive in v1.

## Capability impact (binding)

NEW capability `profile-management` (client profile editing; designed as the base for #15 technician editing to extend). Contract artifacts REGENERATE (additive: PATCH /api/v1/me/profile + schemas).

## Scope boundary (binding)

IN: profiles module (controller+service+DTOs) with guard wiring, PATCH endpoint, transactional update with district revalidation, contract regeneration (openapi.json + generated.ts + gates), offline tests (unit fake-Prisma + inject with guard fixtures). OUT: GET /me/profile (gap note), technician profile (#15), web UI + BFF adapter (UI consumer), email changes, role changes, catalog changes, auth flows, Prisma schema changes.

## Carried forward (binding)

Pending gates unchanged: live Supabase + claim compatibility, production route smoke, live PostgreSQL (transaction/lock/trigger evidence), deployment gates. Offline evidence = fake-Prisma + test-JWKS fixtures ONLY.
