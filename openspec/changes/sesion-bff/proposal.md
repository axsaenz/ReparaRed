# Proposal: Implement BACKLOG.md item #13: BFF login/session (maintain a secure session)

## Intent

Secure sessions with API JWT/JWKS verification and a same-origin Next.js BFF, per ADR-0011 and TECH-DESIGN §8.1; keep tokens server-controlled and forward short-lived bearers.

## Scope

### In Scope
- API `JwtVerifier`, reusable guard/principal, typed auth env, and RSA/JWKS tests.
- BFF routes, SSR provider/cookies, refresh, bearer forwarding, and origin/CSRF.
- Dependencies, lockfile, env example, and environment docs.

### Out of Scope
- UI pages/layouts, profile editing, recovery, rate limiting, live Supabase claims, and NestJS `/me`.

## Capabilities

### New Capabilities
- `bff-session`: API guard plus BFF routes, cookies, refresh, CSRF, and provider seam.

### Modified Capabilities
- None. OpenAPI and generated contract artifacts remain unchanged.

## Approach

- **API:** Add runtime `jose` 6.2.10. Cached `createJWKSVerifier(AUTH_JWKS_URL)` implements `JwtVerifier`; validates algorithm/signature, issuer, required audience, `exp`, `sub`, and a required verified-email claim → `TrustedIdentity`. Reusable Nest guard extracts Bearer: malformed/invalid → `401 AUTHENTICATION_REQUIRED`; unreachable JWKS → `503 DEPENDENCY_UNAVAILABLE`; absent config fails closed. Decorator exposes the request-bound principal; registration consumes it; `IdentityPort` remains fakeable. Env schema/app config type server-only `AUTH_ISSUER_URL`, `AUTH_JWKS_URL`, `AUTH_AUDIENCE`; offline boot may omit, verification fails closed; docs change future→consumed.
- **WEB:** Add `@supabase/ssr` 0.12.5 and `@supabase/supabase-js` 2.114.0 behind bounded fakeable `AuthProvider` (`signInWithPassword`, `signOut`, `getUser`, `refresh`) with generic-safe errors. Implement `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`; `reparared-auth` chunks are Secure/HttpOnly/SameSite=Lax, with explicit local exception, server refresh, short-lived bearer forwarding, and no token responses. ALL mutations require allowed-origin plus custom CSRF header. Logout always clears local cookies; session returns `{authenticated,email?}`. Consume server-only `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
- **Tests:** Generated RSA-keypair/JWKS fixtures cover valid and bad signature/kid/issuer/audience/exp/sub plus unverified email; guarded Fastify `inject()` covers `401/503`. Node Vitest Web Request/Response route tests with fake provider assert statuses, Set-Cookie shapes, CSRF/origin rejection, mocked-fetch Authorization forwarding, and sanitized bodies.

## Recorded Pending Gates

- Live Supabase signup/verification/login/refresh/revocation and claim compatibility (fixtures ≠ live claims); live PostgreSQL evidence; production `next build` route-handler smoke; carried deployment gates. Offline evidence = jose fixtures plus fake provider only.

## Affected Areas

| Area | Impact |
|---|---|
| API auth/config/tests | Verifier/guard, principal, env, fixtures |
| Web auth routes/helpers/tests | BFF, provider, cookies/CSRF |
| Manifests, lockfile, env/docs | Dependencies, consumed server-only names |
| OpenAPI/generated client/contract artifacts | Unchanged |

## Risks

| Risk | Mitigation |
|---|---|
| Live claim mismatch; JWKS rotation/clock skew | Compatibility gate, cache fixtures |
| Cookie bearer replay; frozen CSRF mechanism; provider wrapper assumptions unverifiable offline | Adversarial cookie/origin/header tests, fakes |
| Fail-closed misconfiguration: outage versus unsafe acceptance; new Next/Vitest infrastructure | Config tests, production smoke |

## Rollback Plan

Revert the single commit to remove dependencies, adapters, routes, and env changes; `IdentityPort` fails closed again and registration remains offline-injectable.

## Dependencies

- #10/#12 archived; consumers #14/#15/#18+; Supabase gate pending.

## Success Criteria

- [ ] Offline jose fixtures and fake-provider tests pass required statuses, cookies, CSRF/origin, forwarding, and sanitized bodies.
- [ ] Server-only typed env, lockfile, refresh/cookie contracts, and unchanged OpenAPI artifacts validate.
- [ ] Live Supabase flows/claims, PostgreSQL, production Next smoke, and deployment remain explicitly **NOT SATISFIED** pending gates.
