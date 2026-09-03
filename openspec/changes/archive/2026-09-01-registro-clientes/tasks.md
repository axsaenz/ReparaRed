# Tasks: Client Onboarding

## Review Workload Forecast

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

| Field | Value |
|---|---|
| Estimated authored lines | 550–650; generated contract churn excluded from authored count |
| Delivery strategy | ask-on-risk; established resolution is one cohesive unit, no remote chain, size exception if over 400 |

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Module, service, wiring | Single size-exception | `npm test -- registration` | `server.inject` with fake identity/Prisma | registration module and wiring |
| 2 | Contracts and offline evidence | Same cohesive unit | `npm run contract:check` | export/generate/validate commands | generated artifacts and registration tests |

## Phase 1: Module + Port

- [x] 1.1 Write RED threat tests in `apps/api/src/registration/registration.service.spec.ts` and `apps/api/src/registration/registration.integration.spec.ts` for body identity authority, response secrets, parameterized `FOR SHARE` SQL, and newline/control-character email logging; make no production change yet.
- [x] 1.2 Create `apps/api/src/registration/auth.port.ts`, DTO files, and explicit unavailable production identity guard/provider; preserve `createApp({ identityPort })` and export-only fake seams.
- [x] 1.3 Implement `apps/api/src/registration/registration.service.ts` with the exact five-phase algorithm: normalize, verify, pre-read, one `$transaction` with parameterized district `FOR SHARE`, reconcile/create, allowlist projection, and mapped errors.
- [x] 1.4 Add Swagger controller/module in `apps/api/src/registration/registration.controller.ts` and `registration.module.ts`; wire `apps/api/src/app.module.ts` and `apps/api/src/app.factory.ts` without a production fake.

## Phase 2: Contract Regeneration

- [x] 2.1 Run `npm run contract:export`; verify additive `POST /api/v1/onboarding/client`, request/response schemas, and 400/401/409/422/500 errors.
- [x] 2.2 Run `npm run contract:generate` for `packages/api-client/src/generated.ts`, then `contract:check` and `contract:validate`; record the additive path list.

## Phase 3: Tests

- [x] 3.1 Complete `registration.service.spec.ts` and `auth.port.spec.ts`: 201/200, duplicate 409 twice, 422/401/400, normalization, CLIENT role, P2002 paths, rollback, one transaction, raw query parameters, and no password field.
- [x] 3.2 Complete `registration.integration.spec.ts` with exact JSON/content type, trace header, response scans for authSubject/password/token/provider detail, and all specified status paths.

## Phase 4: Verification Gates

- [x] 4.1 Re-run RED trust-boundary and RED secrets scans before staging; confirm body identity is rejected/ignored and unsafe values never appear in responses or code.
- [x] 4.2 Run lint, format:check, typecheck, test, build, `contract:check`, and `contract:validate`; retain green evidence.
- [x] 4.3 RED commit-state: stage only registration production files, `app.module.ts`, regenerated `openapi.json`/`generated.ts`, and change artifacts; exclude unrelated generation. Create exactly `chore: add client onboarding`, clean tree; never `commit -a` or push.

## Phase 5: Records

- [x] 5.1 Write `openspec/changes/registro-clientes/apply-progress.md` with delivery resolution, work-unit/RED evidence, final authored count excluding generated churn, pending live Supabase adapter (#13 + gate), PostgreSQL transaction/trigger/lock behavior, and end-to-end BFF flow; note technician-onboarding ownership.
