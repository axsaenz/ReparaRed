# Apply Progress: Client Onboarding

## Delivery Resolution

- Artifact store: `openspec`.
- Mode: Standard (Vitest exists and `strict_tdd: false`).
- Delivery: `size:exception`, one cohesive unit, no remote chain.
- The approved workload forecast was 550–650 authored lines with generated contract churn excluded. The implementation is reported honestly below; no code, tests, comments, or documentation were compressed to satisfy the review budget.

## Completed Work

All twelve assigned tasks are complete:

- [x] 1.1–1.4 Module, port, DTOs, service, controller, module, wiring, and RED threat coverage.
- [x] 2.1–2.2 OpenAPI export, generated client, additive contract checks, and validation.
- [x] 3.1–3.2 Service, auth-port, and HTTP integration coverage.
- [x] 4.1–4.3 Trust/secrets RED gates, quality gates, and the exact delivery commit.
- [x] 5.1 This cumulative apply-progress record.

## Additive Contract Surface

- `POST /api/v1/onboarding/client`
- `OnboardClientRequestDto` request schema with `name`, E.164 `phone`, and UUID `districtId`.
- `ClientOnboardingResponseDto` and nested `ClientProfileResponseDto` response schemas.
- Documented `200`, `201`, `400`, `401`, `409`, `422`, and `500` responses; the error responses use the existing `ProblemDetailsDto` contract.

## Work Unit Evidence

| Work unit | Focused test command and exact result | Runtime harness command/scenario and exact result | Rollback boundary |
|---|---|---|---|
| Phase 1 — module, port, service, wiring | `npm test --workspace=@repara/api -- --run src/registration` — 3 registration files, 26 tests passed. | `npm test --workspace=@repara/api -- --run src/registration/registration.integration.spec.ts` — HTTP `server.inject` harness covers create, reconcile, conflicts, district, identity, malformed input, and safe 500. | Revert `apps/api/src/registration/` and the `app.module.ts`/`app.factory.ts` wiring changes. |
| Phase 2 — contracts | `npm run contract:check` — export, generate, freshness, validation, and workspace typecheck passed; `npm run contract:validate` — OpenAPI document valid. | Contract export initializes the real Nest metadata graph through `createAppForExport()` with an explicit deterministic fake identity port and no listening socket. | Revert `apps/api/openapi.json` and `packages/api-client/src/generated.ts`. |
| Phase 3 — tests | Registration suite passed with service, auth-port, and integration assertions for normalization, roles, transaction intent, rollback mapping, HTTP status, trace, and secret absence. | `server.inject` exercises the composed Fastify/Nest route with an injectable identity port and fake Prisma behavior. | Revert the three registration spec files without changing production behavior. |
| Phase 4 — verification | `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, and `npm run build` all exited successfully. | RED trust boundary: `npm test --workspace=@repara/api -- --run src/registration/registration.integration.spec.ts -t "body-supplied identity"` — 1 passed. RED secret/SQL/log boundary: `npm test --workspace=@repara/api -- --run src/registration -t "sanitized|secrets|unverified|parameter"` — 5 passed. | Revert the single onboarding commit; no schema or migration rollback is required. |
| Phase 5 — records | This file and `tasks.md` were updated in the OpenSpec change root. | `git status --short` and staged-path inspection are the commit-state harness. | Revert only this change root record and its task checkboxes if records must be withdrawn. |

## Implementation Evidence

- Trusted identity is obtained only from `IdentityPort`; the production default is `UnavailableIdentityPort`, while `FakeIdentityPort` is supplied explicitly only by tests and offline contract export.
- Request parsing rejects non-object input and unknown identity/credential-bearing keys before persistence.
- The service normalizes provider email by trim plus lowercase, performs subject/email pre-reads, rechecks inside one Prisma transaction, uses tagged parameterized SQL with `FOR SHARE`, and returns an allowlisted projection.
- Email-targeted `P2002` errors map to generic `409`; other persistence failures map to safe `500`; unverified/unavailable identity maps to `401`; missing or inactive districts map to stable `422` field errors.
- RED commit-state staging was restricted to registration production/tests, `app.module.ts`, `app.factory.ts`, regenerated contract artifacts, and the `openspec/changes/registro-clientes/` artifacts. No unrelated generated files were included.

## Authored Line Count

The final authored implementation count is **1,029 changed lines**: 409 production/wiring lines and 620 test lines, counting additions plus deletions and excluding generated contract churn. Generated churn is reported separately as 581 OpenAPI additions plus 326 generated-client additions (907 lines). The change artifacts are records rather than implementation-budget lines. The approved `size:exception` resolution remains in force because this is one cohesive onboarding unit and the code and evidence were not compressed to meet a line budget.

## Deviations

None — implementation follows the normative design algorithm and existing catalogs/error/filter patterns.

## Issues

- Prisma emits its existing Prisma 7 configuration deprecation warning during generation; it does not fail any gate and is outside this change's scope.
- The repository lint command emits the existing Next.js pages-directory informational warning while exiting successfully.

## Remaining and Pending Gates

- Live Supabase identity adapter: **DEFERRED**. The replaceable port exists; the real adapter arrives with #13 and the Supabase provisioning gate.
- Live PostgreSQL transaction, rollback, trigger, and row-lock behavior: **PENDING** and not claimed by offline fake-Prisma evidence.
- End-to-end BFF registration flow: **PENDING** for #13+.
- Technician onboarding is outside this client-only slice; the technician gap and ownership remain recorded for the owning item/review.

## Status

12/12 tasks complete. Ready for `sdd-verify`.
