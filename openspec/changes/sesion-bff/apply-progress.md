# Apply Progress: BFF login/session

## Status

- Change: `sesion-bff`
- Mode: Standard (strict TDD disabled)
- Delivery resolution: `size:exception` approved by the maintainer; one cohesive unit, no remote chain.
- Tasks: 15/15 complete.

## Completed Implementation

The API now verifies RS256 Supabase-style JWTs against cached remote JWKS,
requires the frozen `sub`, `email`, and `email_verified=true` claim contract,
and exposes an explicit guarded principal. Missing auth configuration fails
closed while key transport failures map to dependency-unavailable responses.
The registration endpoint uses the production guard while retaining its
explicit offline identity seam for export and integration fakes.

The web now owns the server-only Supabase SSR provider, chunk-aware
`reparared-auth` cookies, readable CSRF double-submit cookie, exact origin
allowlisting, bounded refresh, sanitized session routes, logout cleanup, and
typed short-lived bearer forwarding. No route response or application log
contains access tokens, refresh tokens, credentials, or provider details.

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `npm test --workspace=@repara/api -- --run src/auth src/config/env.schema.spec.ts src/app.integration.spec.ts` — PASS, 4 files and 49 tests; `npm test --workspace=@repara/web` — PASS, 5 files and 11 tests. Full workspace suite also PASS: 28 API files/186 tests plus 5 web files/11 tests. |
| Runtime harness command/scenario and exact result | Offline approved harness: RSA key-pair/JWKS fixtures, Fastify `inject()`, Web `Request`/`Response`, and fake provider — PASS. Live Supabase runtime is explicitly pending. |
| Rollback boundary | Revert the single `chore: add BFF session` commit; this removes API auth/config wiring, web BFF routes/providers, dependencies, tests, env examples, docs, and change artifacts together. |

## RED Evidence

| Boundary | RED scenario and result |
|---|---|
| Bearer/principal trust | Forged body identity, malformed compact bearer values, bad signature/kid/issuer/audience/expiry/subject, and unverified email were rejected; valid identity was attached only by the verifier. PASS. |
| Secrets and logs | Route responses were asserted to omit access-token material and provider detail; auth cookies were asserted HttpOnly/Secure/Lax and CSRF remained readable only. Existing API request serializers redact authorization/cookie fields. PASS. |
| CSRF and origin | Invalid origin and missing/forged double-submit headers returned 403 before fake provider calls. PASS. |
| Dependency/config failure | Missing API verifier config returned 401; mocked JWKS transport failure returned 503; provider failures remained generic and logout cleared local chunks. PASS. |

## Quality Gates

- `npm run lint --workspace=@repara/api` — PASS.
- `npm run lint --workspace=@repara/web` — PASS (framework emitted its existing pages-directory warning; exit code 0).
- `npm run format:check` — PASS.
- `npm run typecheck` — PASS.
- `npm test` — PASS.
- `npm run build` — PASS, including Next route collection and API Prisma/TypeScript build.
- `npm run contract:check` — PASS.
- `npm run contract:export` — PASS; `apps/api/openapi.json` and generated client artifacts remained unchanged in `git status`.
- Commit-state RED completed by explicit path staging only; no `commit -a` and no push.

## Authored Count and Delivery Boundary

The implementation, configuration, documentation, and manifest diff contains
**1,492 authored additions/deletions**, excluding the 126-line generated
dependency lockfile refresh (1,618 lines including that refresh). This remains
one cohesive BFF unit and is delivered under the explicitly approved
`size:exception`; code, tests, docs, and lockfile were not compressed to fit an
ordinary review budget.

## Deviations and Issues

- No functional deviation from `design.md` was required.
- The pre-existing Next ESLint configuration reports that no legacy `pages`
  directory exists; the lint command exits successfully and App Router routes
  build successfully.
- Live provider behavior is not asserted by offline fixtures.

## Pending Gates — NOT SATISFIED

The following remain unsatisfied and must be handled by verification/release
work: live Supabase sign-in, refresh, revocation, and provider error flows;
claim compatibility between the frozen `sub`/`email`/`email_verified` contract
and live tokens; production Next route smoke with the deployment build;
live PostgreSQL evidence; and deployment/promotion gates.
