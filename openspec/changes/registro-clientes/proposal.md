# Proposal: Implement BACKLOG.md item #12: Client registration (client slice = verified onboarding)

## Intent
- Deliver verified client onboarding: one short transaction creates a `CLIENT` user/profile, validates an active district, handles duplicate email, and reconciles same-subject retries via an injectable trusted-identity port (TD §8.1; ADR-0006).

## Scope
### In Scope
- `POST /api/v1/onboarding/client`, DTO validation, sanitized `{ id, role, profile: { name, phone, districtId } }`, and 201/200 create/reconcile responses.
- Registration module, fake adapter, transaction/error behavior, regenerated contracts, and offline tests.
### Out of Scope
- Web/BFF/login/session/JWT (#13+), profile editing (#14/#15), technician onboarding, passwords, live Supabase claims, env or Prisma schema changes, and live PostgreSQL proof.

## Capabilities
### New Capabilities
- `client-onboarding`: verified onboarding with atomic user/profile creation, idempotency, and district/conflict rules.
### Modified Capabilities
- None; contract regeneration is an additive artifact refresh.

## Approach
- Add `apps/api/src/registration/`: `AuthPort` returns trusted `{ authSubject, email, emailVerified }`; use `FakeIdentityAdapter` offline; document the real adapter as deferred.
- Freeze email normalization at the API boundary: trim plus locale-independent lowercase. Unverified identity returns 401 `AUTHENTICATION_REQUIRED` with no creation.
- Pre-read: same subject plus complete profile → 200; another user with that email → generic 409. One short `prisma.$transaction` rechecks identity, validates/locks active district (`FOR SHARE` intent), and creates `CLIENT` user plus nested complete profile, with no network. Missing/inactive district → 422 `SEMANTIC_INVALID` with `fieldErrors.districtId`; pre-read/race email `P2002` → generic 409; other persistence errors → safe 500.
- Add DTO metadata (`@ApiProperty`: name 2–100, E.164 phone, UUID districtId), wiring, and minimal `app.factory` override seam. Never return subject, password, or token.
- Regenerate `apps/api/openapi.json` and `packages/api-client/src/generated.ts`; require green `contract:check`/`contract:validate`. Test one-transaction fake-Prisma assertion, normalization, role, no password field, verified/unverified/unavailable fakes, and injection 201/200/409/422/401 with exact JSON, content type, trace header, and no sensitive values.

## Affected Areas
| Area | Impact | Description |
|---|---|---|
| `apps/api/src/registration/`, `app.module.ts` | New/Modified | Module and wiring. |
| `app.factory.ts`, tests | Modified | Override seam and offline coverage. |
| OpenAPI/client artifacts | Modified | Additive regeneration. |
| Env, Prisma schema, manifests | None | No changes. |

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Auth seam/offline limits | High | Defer adapter; label pending gates. |
| Email, duplicate, or district races | Med | Freeze normalization; map unique errors; transactional recheck. |
| Profile requirements/contract churn | Med | Complete writes; regenerate and validate together. |

## Rollback Plan
- Revert the single commit to remove the module and regenerated contract delta; no data is created by rollback.

## Dependencies
- #3, #5, and #10 archived; #13+ consumers; Supabase gate pending.
- Item #12 names client registration; technician onboarding has no dedicated item. This client-only slice records ownership for #15/#16 review.

## Recorded Pending Gates
- Supabase signup/verification/token claims (adapter deferred until its gate and #13).
- Live PostgreSQL transaction/rollback/trigger/lock behavior.
- End-to-end BFF registration (#13+); offline evidence is fake-client orchestration and fake identity port only.

## Success Criteria
- [ ] Offline orchestration, contract checks, and validation pass; responses contain no password, subject, token, or provider detail.
- [ ] The three live gates above remain explicitly unsatisfied until their environments and evidence exist.
