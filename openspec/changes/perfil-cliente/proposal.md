# Proposal: Implement BACKLOG.md item #14: Edit client profile

## Intent

Authenticated clients need to edit their own name, phone, and district through a guarded partial-update endpoint with transactional active-district revalidation and a published contract surface, per TECH-DESIGN §7.2 and ADR-0015.

## Scope

### In Scope
- Add `PATCH /api/v1/me/profile` in a new profiles module.
- Enforce persisted CLIENT authorization, identity-derived ownership, validation, safe errors, and transactional persistence.
- Regenerate `apps/api/openapi.json` and `packages/api-client/src/generated.ts`; add offline API and contract tests.

### Out of Scope
- GET `/me/profile` is NOT in this slice (strict item scope); record this gap for orchestrator review, likely #15 or the profile UI item.
- Technician profile (#15), web UI/BFF adapter, email or role changes, catalog/auth flows, and schema or migration changes.

## Capabilities

### New Capabilities
- `profile-management`: Authenticated CLIENT self-service profile editing.

### Modified Capabilities
- None.

## Approach

Create `apps/api/src/profiles/` with DTOs carrying Swagger metadata. The controller uses the existing auth guard and `@CurrentIdentity`: missing authentication returns 401; a persisted non-CLIENT role returns 403 `FORBIDDEN`; ownership is derived from the verified identity and never from body `userId`. The service runs a short transaction: lock the client profile row, return 404 `NOT_FOUND` if absent, revalidate a provided district with `FOR SHARE` and return 422 `SEMANTIC_INVALID` with `fieldErrors.districtId` when missing/inactive, then update only supplied fields. Name is trimmed and 2–100 characters; phone uses onboarding’s E.164 rule. The response is the full sanitized projection `id`, `role`, and `profile{name, phone, districtId}`. The PATCH DTO makes every field optional but requires at least one; unknown/malformed input returns 400.

Add fake-Prisma service unit tests for payload shape, locks, revalidation, and 404/403/422/400 paths; `inject()` tests with test-JWKS guard fixtures for client 200, technician 403, no token 401, absent profile 404, inactive district 422, malformed body 400, and ignored body `userId`. Regenerate contracts and require `contract:check`/validate green with additive assertions.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/api/src/profiles/`, `apps/api/src/app.module.ts` | New | Controller, service, DTOs, guard integration and module wiring. |
| `apps/api/openapi.json`, `packages/api-client/src/generated.ts` | Modified | Additive PATCH contract and types. |
| API tests | New | Unit, guarded integration, and contract assertions. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| First guarded private route or role bypass | Med | Guard fixtures; persisted-role and body-identity assertions. |
| District deactivation race | Med | In-transaction `FOR SHARE` revalidation; record live evidence as pending. |
| Lost-update semantics of partial PATCH | Med | Serialize profile writes with the row lock; no optimistic contract is added. |
| Contract churn | Med | Regenerate additively and run contract gates. |
| Profile-absent state and offline limits | Med | Generic 404 tests and explicit pending gates. |

## Rollback Plan

Revert the single implementation commit; this removes the module and contract delta without changing data.

## Dependencies

- #12 and #13 archived; #15 extends this module; a later UI consumer owns the BFF adapter.

## Success Criteria

- [ ] Offline unit/integration tests and contract export, check, validation, freshness, compatibility, and typecheck pass.
- [ ] PATCH persists only supplied editable fields and returns the sanitized projection with required error mappings.
- [ ] Pending (not satisfied): live Supabase/claims, production smoke, live PostgreSQL transaction/lock evidence, and deployment.
