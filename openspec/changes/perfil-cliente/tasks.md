# Tasks: Client Profile Editing

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated authored lines | 500–600 (module 200–250, helpers 60–80, tests 250–300; generated churn excluded) |
| Suggested split | One cohesive PR under approved `size:exception`; no remote chain |
| Delivery strategy | ask-on-risk |

### Suggested Work Units

| Unit | Goal | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| 1 | Module, contracts, tests, and records as one reviewable slice | `profiles.service.spec.ts` and `profiles.integration.spec.ts` | Fastify `inject()` with fake Prisma/JWKS; live gates are N/A and remain pending | Revert the single implementation commit |

## Phase 1: Module

- [ ] 1.1 Write RED trust, SQL-parameterization, secrets, and log-injection cases in `apps/api/src/profiles/profiles.service.spec.ts` before production code.
- [ ] 1.2 Create `apps/api/src/common/validation/profile-fields.ts` and `apps/api/src/common/validation/active-district.ts` for whitelist, trimmed bounds, E.164, UUID, and tagged `FOR SHARE` validation.
- [ ] 1.3 Create `apps/api/src/profiles/dto/update-client-profile.request.dto.ts` and `apps/api/src/profiles/dto/client-profile.response.dto.ts` with Swagger metadata and the allowlisted projection.
- [ ] 1.4 Create `apps/api/src/profiles/profiles.service.ts` and `apps/api/src/profiles/profiles.controller.ts` with persisted-role authorization, identity ownership, locked transaction, partial update, and safe 400/422/500 mapping.
- [ ] 1.5 Create `apps/api/src/profiles/profiles.module.ts` and wire `apps/api/src/app.module.ts` with `DatabaseModule`, `AuthModule.register(identityPort)`, guard, and `@CurrentIdentity()` consumption.

## Phase 2: Contract

- [ ] 2.1 Run `contract:export` to add PATCH `/api/v1/me/profile`, schemas, security, and 400/401/403/404/422/500 responses to `apps/api/openapi.json`.
- [ ] 2.2 Run `contract:generate` to regenerate `packages/api-client/src/generated.ts`; run `contract:check` and contract validation, preserving every existing path.
- [ ] 2.3 Record the additive path list and schema diff for `openspec/changes/perfil-cliente/apply-progress.md`.

## Phase 3: Tests

- [ ] 3.1 Complete `apps/api/src/profiles/profiles.service.spec.ts` for full/partial updates, only-defined data, locks, parameterized raw query shapes, 400/403/404/422/500, rollback, and sanitized projection.
- [ ] 3.2 Create `apps/api/src/profiles/profiles.integration.spec.ts` using the reused or extracted JWKS helper `apps/api/src/profiles/test-jwks.fixture.ts` (source `apps/api/src/auth/jwks-verifier.spec.ts` (read-only)); cover inject 200 partial/full, 401/403/404/400/422, ignored body `userId`, trace header, and safe responses.

## Phase 4: Gates + Commit

- [ ] 4.1 Run the RED trust-boundary body-`userId` test and RED secrets/log scan before staging; control characters must not forge logs or expose internals.
- [ ] 4.2 Run lint, `format:check`, typecheck, tests, build, `contract:check`, and validation; record unavailable live evidence as `PENDING GATE`.
- [ ] 4.3 Run the commit-state RED: stage only `apps/api/src/profiles/` (including tests), `apps/api/src/common/validation/`, `apps/api/src/app.module.ts`, regenerated `apps/api/openapi.json`, `packages/api-client/src/generated.ts`, and `openspec/changes/perfil-cliente/` artifacts; inspect status/diff.
- [ ] 4.4 Create exactly one commit `chore: add client profile editing`; never use `commit -a`, never push, and require a clean tree.

## Phase 5: Records

- [ ] 5.1 Create `openspec/changes/perfil-cliente/apply-progress.md` with `size:exception` resolution, work-unit and RED evidence, final authored count excluding generated churn, pending live gates, additive paths, and the GET `/me/profile` gap note.
