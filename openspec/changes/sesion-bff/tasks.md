# Tasks: BFF login/session

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

## Review Workload Forecast

Estimated authored change: ~900–1,100 lines (API auth/env ~240; web BFF ~280; tests ~450; manifests/docs ~60). Delivery remains one cohesive unit with maintainer-approved `size-exception`; no remote chain.

### Suggested Work Unit

| Unit | Goal | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| 1 | Complete API, web, tests, docs, and manifests | `npm test --workspace apps/api && npm test --workspace apps/web` | N/A offline: RSA/JWKS fixtures and fake provider are the approved harness | Revert the single BFF commit |

## Phase 1: API auth foundation

- [x] 1.1 Write RED tests in `apps/api/src/auth/jwks-verifier.spec.ts` for forged body identity, strict bearer failures, malicious header/email log injection, and no trusted principal.
- [x] 1.2 Add `jose@6.2.10` to `apps/api/package.json` and `package-lock.json`; create `apps/api/src/auth/jwt-verifier.port.ts` and `apps/api/src/auth/jwks.verifier.ts` for RS256, cached JWKS, issuer/audience, exp/sub, and verified email.
- [x] 1.3 Create `apps/api/src/auth/auth.guard.ts`, `apps/api/src/auth/auth.decorator.ts` with `@CurrentIdentity`, and `apps/api/src/auth/auth.module.ts`; wire fail-closed/unavailable verifiers and explicit principal consumption through `apps/api/src/app.module.ts`, `apps/api/src/app.factory.ts`, `apps/api/src/registration/registration.controller.ts`, and `apps/api/src/registration/registration.service.ts`.
- [x] 1.4 Extend `apps/api/src/config/env.schema.ts` and `apps/api/src/config/app-config.service.ts` with optional URI/non-empty `AUTH_ISSUER_URL`, `AUTH_JWKS_URL`, `AUTH_AUDIENCE` getters; update `apps/api/.env.example` and `docs/environments.md` from future to consumed, never logging values.

## Phase 2: WEB BFF

- [x] 2.1 Write RED route tests under `apps/web/src/app/api/auth/` proving origin/CSRF rejection before provider calls, token-free bodies, cookie flags, and logout local-clear on provider failure.
- [x] 2.2 Add `@supabase/ssr@0.12.5` and `@supabase/supabase-js@2.114.0` to `apps/web/package.json` and `package-lock.json`; create `apps/web/src/lib/auth/` provider port, Supabase adapter, `reparared-auth` cookie chunks with Secure/HttpOnly/SameSite=Lax, CSRF double-submit, and `withBearer`.
- [x] 2.3 Create `apps/web/src/app/api/auth/login/route.ts`, `logout/route.ts`, and `session/route.ts` with bounded refresh, sanitized responses, generic errors, and same-origin mutation policy.
- [x] 2.4 Update `apps/web/.env.example` and `docs/environments.md` with server-only `SUPABASE_URL`, `SUPABASE_ANON_KEY`, origin policy, and explicit local-cookie exception.

## Phase 3: API tests

- [x] 3.1 Complete RSA fixture coverage in `apps/api/src/auth/jwks-verifier.spec.ts`: valid, bad signature/kid/issuer/audience/exp/sub, unverified email, and malformed tokens.
- [x] 3.2 Complete `apps/api/src/auth/auth.guard.spec.ts` and guarded Fastify `inject()` integration in `apps/api/src/app.integration.spec.ts`: 401 absent/malformed/config-missing, 503 mocked JWKS outage, 200 valid principal, and offline export green.

## Phase 4: WEB tests

- [x] 4.1 Add Node Vitest Web `Request` specs at `apps/web/src/app/api/auth/login/route.spec.ts`, `logout/route.spec.ts`, and `session/route.spec.ts`: cookie attributes/chunks, no token body, sanitized session, 403 origin/CSRF-before-provider, and logout clear-on-throw.
- [x] 4.2 Add fake-provider and `withBearer` tests asserting bounded calls, refresh, mocked-fetch `Authorization`, and no secret/log exposure.

## Phase 5: Verification gates + commit

- [x] 5.1 Run RED trust-boundary, secrets/log, and CSRF gates; then run lint, format:check, typecheck, test, build (including web dependencies), and confirm no token/bearer responses or logs.
- [x] 5.2 Run `contract:check` unchanged-green; after `contract:export`, `git status` MUST show no `openapi.json` diff. Run commit-state RED, explicitly stage only intended auth/env/web/manifests/lockfile/.env/docs/tests/change artifacts, create exactly `chore: add BFF session`, never `commit -a` or push.

## Phase 6: Records

- [x] 6.1 Record `openspec/changes/sesion-bff/apply-progress.md` with size-exception resolution, work-unit and RED evidence, final authored count, and pending live Supabase/claim compatibility (frozen claims), production Next route smoke, live PostgreSQL, and deployment gates.
