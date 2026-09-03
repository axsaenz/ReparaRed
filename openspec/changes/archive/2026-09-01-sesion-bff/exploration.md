## Exploration: Implement BACKLOG.md item #13 — BFF login/session

### Current State

- BACKLOG item #13 is **Mantener una sesión segura**. It depends on #10 (OpenAPI/client) and #12 (registration), and is consumed by profile work (#14/#15) and the request flow (#18 and later private features). The backlog explicitly includes login, renewal, logout, secure cookies, CSRF, JWT validation, and private role routes.
- The accepted architecture is a same-origin Next.js session BFF in front of a bearer-token API. The repository already has scaffolded API and web applications, although `openspec/config.yaml` still describes the repository as planning-only.
- The locked decisions are:
  > “Next.js actuará como Backend for Frontend de sesión. El navegador se comunicará únicamente con su mismo origen para iniciar o cerrar sesión y para consumir datos privados. La sesión se mantendrá mediante cookies `Secure`, `HttpOnly` y con una política `SameSite` explícita; los Route Handlers renovarán la sesión en el servidor cuando corresponda y enviarán a NestJS un token de acceso de corta duración en el encabezado `Authorization`.” — ADR-0011
  > “Los Route Handlers serán adaptadores explícitos para las operaciones que usa la web y consumirán el cliente derivado del contrato OpenAPI. No funcionarán como un proxy abierto, no accederán directamente a las tablas de dominio y no duplicarán reglas de autorización o negocio. NestJS verificará cada token y seguirá siendo la autoridad final.” — ADR-0011
  > “Las mutaciones originadas en el navegador comprobarán origen y aplicarán protección CSRF acorde con la configuración de cookies.” — ADR-0011
  > “Autenticación se expone en el mismo origen de Next.js y delega en Supabase Auth. La API NestJS recibe únicamente tokens entre servidores.” — TECH-DESIGN §7.2
  > “NestJS valida firma JWT mediante JWKS, emisor, audiencia, expiración y sujeto; después carga rol y perfil desde PostgreSQL.” — TECH-DESIGN §8.1
  > “Supabase Auth administrará credenciales, sesiones, recuperación y emisión de tokens.” — ADR-0006
- API identity is currently only a replaceable `IdentityPort` with `getVerifiedIdentity()`. `UnavailableIdentityPort` fails closed; `FakeIdentityPort` is used by offline tests and contract export. `RegistrationModule.register()` receives the port explicitly, and `createApp()` currently defaults to `UnavailableIdentityPort`. There is no JWT verifier, authorization guard, request principal, or production selection of a real adapter.
- `apps/api/src/config/env.schema.ts` consumes only foundation/database values. `AUTH_ISSUER_URL` and `AUTH_JWKS_URL` are accepted as unknown keys rather than typed/validated configuration. Both `apps/api/.env.example` and `docs/environments.md` mark them future/not consumed. They become consumed by this change; the server-only classification must remain.
- The current OpenAPI document exposes catalog/system paths and `POST /api/v1/onboarding/client`. It has no session, `me`, or profile endpoint, although `/me/profile` is listed as a planned logical API surface in TECH-DESIGN §7.2. There is therefore no locked API introspection endpoint for this change. Adding one would require controller metadata, contract export, generated-client refresh, and compatibility checks.
- The web is a bare Next.js App Router skeleton (`layout.tsx`, `page.tsx`) with no route handlers, auth dependencies, cookie helpers, API-origin usage, or private-route layouts. Its only test is a baseline component-shape test under Vitest's `node` environment.
- `packages/api-client` contains generated OpenAPI types and an `openapi-fetch` factory. It accepts caller-supplied base URL, fetch, and headers and deliberately owns no cookies, session state, tokens, or business rules. The web does not currently depend on this package.
- Empirical package lookup on 2026-09-03 returned `jose` **6.2.10**, `@supabase/supabase-js` **2.114.0**, and `@supabase/ssr` **0.12.5**. None is declared in the current web/API manifests. No package was installed.

### Affected Areas

- `apps/api/src/registration/auth.port.ts` — preserve the offline fake and fail-closed behavior while introducing an explicit, request-safe verification boundary; the current zero-argument method has no token source.
- `apps/api/src/...` new authentication adapter/guard modules — use `jose` JWKS verification, validate signature/algorithm, issuer, audience, expiration, and subject, require a verified email claim for `TrustedIdentity`, and attach only a trusted principal for downstream authorization. The guard must be reusable by future private routes.
- `apps/api/src/registration/registration.module.ts`, `apps/api/src/app.module.ts`, and `apps/api/src/app.factory.ts` — wire the real adapter for runtime configuration without breaking explicit fake injection used by tests/export; public and offline boot must continue to fail closed when auth configuration is absent.
- `apps/api/src/config/env.schema.ts` and `apps/api/src/config/app-config.service.ts` — type and validate `AUTH_ISSUER_URL` and `AUTH_JWKS_URL`; decide whether production requires them at boot while test/local offline boot remains possible. An explicit audience setting is also unresolved.
- `apps/api/.env.example`, `docs/environments.md`, and likely the deployment validation expectations — change Auth/JWKS from future to consumed server-only names, while keeping values out of committed files and keeping Vercel free of API credentials.
- API auth tests — generate test RSA keys and a local JWKS fixture; cover valid tokens and invalid signature, `kid`, issuer, audience, expiry, subject, email, and verification-state claims. Add guard/HTTP tests using the existing Fastify `inject()` pattern.
- `apps/web/src/app/api/auth/login/route.ts`, `logout/route.ts`, and a minimal `session/route.ts` if selected — same-origin POST/GET handlers, safe error mapping, cookie set/clear, refresh, and no token response. These are BFF endpoints, not OpenAPI API endpoints.
- New web auth/session modules — define a fakeable Supabase provider boundary, server cookie adapter, CSRF/origin checks, and token-to-API forwarding. Keep provider calls and cookie operations out of UI components.
- `apps/web/package.json`, the root lockfile, and web tests — add the selected auth dependencies and direct route/helper tests. The current node-based Vitest setup can invoke Web `Request`/`Response` route functions, but it has no existing Next route test harness or browser environment.
- `packages/api-client/src/*` and `apps/api/openapi.json` — unchanged if this slice adds no NestJS session/me endpoint; used by future explicit BFF adapters for private domain calls. If a new API endpoint is chosen, regenerate both artifacts and run validation, freshness, compatibility, and type checks.

### Approaches

1. **`jose` local JWT verification with a reusable API guard** — construct a cached remote JWKS verifier from `AUTH_JWKS_URL`, require configured issuer/audience, verify the bearer token offline against test keys, map only verified claims to `TrustedIdentity`, and let the guard expose a request principal.
   - Pros: matches ADR-0006/ADR-0011, no provider call per API request, works offline with generated RSA/JWKS fixtures, standard library choice (`jose` 6.2.10), and reusable by every future protected route.
   - Cons: claim names and audience must be frozen; JWKS cache/rotation/error behavior needs explicit tests; the current `IdentityPort` signature must be made request-aware or separated from the guard.
   - Effort: Medium.

2. **Provider SDK/introspection on every API request** — use Supabase SDK calls instead of local JWT verification.
   - Pros: provider-managed claim interpretation and revocation semantics.
   - Cons: network dependency and latency on every request, not consistent with ADR-0006's no-remote-verification consequence, difficult to verify offline, and it does not satisfy the requested JWKS adapter.
   - Effort: Medium.

3. **Opaque BFF session ID backed by server-side state** — store tokens outside the browser and issue only an opaque cookie to Next.js.
   - Pros: reduces bearer material in cookies and allows central revocation.
   - Cons: introduces a session store and lifecycle not present in the design, requires Vercel-compatible shared state, adds another failure mode, and is unnecessary for the locked “no privileged Vercel credentials” boundary.
   - Effort: High.

4. **Supabase SSR cookie session with a fakeable provider wrapper** — use `@supabase/ssr` plus `@supabase/supabase-js` in server-only BFF code; the wrapper performs password login, refresh, user/session read, and logout while a test fake replaces the provider boundary.
   - Pros: follows the intended App Router cookie model, keeps access and refresh material out of browser JavaScript, supports server refresh, and avoids inventing a session database. An end-user access/refresh token in an HttpOnly cookie is not a privileged PostgreSQL/Storage credential, so it is compatible with TECH-DESIGN §12.3, while still requiring bearer-credential protections.
   - Cons: live provider behavior remains untestable without Supabase; SSR cookie chunking/naming and refresh semantics must be pinned; provider SDK failures need safe mapping and timeouts.
   - Effort: Medium.

5. **Manual Supabase REST/SDK calls with custom cookies** — call the provider login/refresh endpoints directly and serialize a project-owned cookie.
   - Pros: small explicit provider seam and direct control over cookie names.
   - Cons: duplicates provider session-cookie behavior, increases refresh and rotation risk, and loses the SSR package's established cookie handling.
   - Effort: Medium.

### Boundary Analysis

**In scope**

- API-side JWT/JWKS adapter, reusable authentication guard, trusted-claim mapping, runtime wiring, and offline RSA/JWKS tests.
- API Auth/JWKS environment schema/configuration and server-only environment documentation/example updates.
- BFF `POST /api/auth/login`, `POST /api/auth/logout`, and a minimal `GET /api/auth/session` only if the UI-state need is confirmed; all are same-origin and must never return tokens.
- HttpOnly/Secure/explicit-SameSite cookie handling, server refresh, origin/CSRF checks, safe error behavior, provider wrapper seam, and direct route/helper tests with a fake provider.
- BFF use of `@repara/api-client` for future/private API calls, without adding a generic proxy. Contract artifacts change only if a new NestJS endpoint is deliberately added.

**Out of scope**

- Live Supabase project provisioning, live signup/email verification, real credential flows, and provider acceptance; these remain pending gates.
- Web login/register pages, private UI layouts, dashboards, profile editing (#14/#15), request form (#18), registration UI, and password recovery UI/flows.
- Domain authorization/business rules, role mutation, profile persistence, rate limiting (#27), monitoring/SLO work, and privileged Vercel database/Storage credentials.

### Open Decisions

| Decision | Options | Recommendation |
|---|---|---|
| Verifier/port shape | Make `IdentityPort` accept an explicit bearer/request principal; or add a `JwtVerifier` port plus a guard-provided trusted principal while retaining `FakeIdentityPort`. | Prefer a separate verifier/guard boundary with no ambient global request state. Preserve injectable fake/unavailable adapters and have registration consume an explicitly trusted principal. Freeze the exact Nest request/decorator signature in design. |
| JWT claims | Hard-code the provider audience; add server-only `AUTH_AUDIENCE`; or accept any audience (unsafe). | Add a required server-side audience contract, preferably `AUTH_AUDIENCE`, and reject absent/mismatched issuer, audience, `sub`, `exp`, signature, or verified-email claim. Do not trust editable role metadata; load role/profile from PostgreSQL. |
| Access/refresh storage | Supabase SSR-managed HttpOnly cookies; raw project cookie; opaque ID plus shared store. | Use `@supabase/ssr` behind a project-owned wrapper. Keep access tokens server-only, forward only a valid short-lived bearer, refresh server-side, and clear all session cookie chunks on logout. No session database in this change. |
| Cookie contract | Provider-derived names; fixed project name; exact custom names with chunk suffixes. | Override/document a stable project-owned base name (for example `reparared-auth`) and its chunking behavior rather than accepting provider-hostname-derived defaults. Session cookies MUST be Secure, HttpOnly, and explicitly SameSite; local test exceptions must be explicit and never production defaults. |
| Duration and refresh | Fixed application TTL; provider TTL; refresh only after expiry. | No numeric duration is locked in the ADRs or TECH-DESIGN. Freeze a bounded short-lived access-token policy in proposal, align cookie expiry with the provider session/refresh contract, refresh before expiry with clock skew, and never expose refresh material to JavaScript. |
| CSRF | SameSite alone; Origin/Referer alone; SameSite plus origin and double-submit/custom header. | Use explicit `SameSite=Lax` or `Strict` (proposal must choose), strict allowed-origin validation, and a custom CSRF header/double-submit token for every browser-originated BFF mutation, including login/logout. Do not rely on UI hiding or SameSite alone. |
| Session read surface | No BFF read route; BFF status route; new API `/me` endpoint. | Add only a minimal same-origin `GET /api/auth/session` returning sanitized authentication state if downstream UI needs it. Do not add a NestJS session/me endpoint here: none is locked, and `/me/profile` belongs to later profile work. |
| Provider failure behavior | Propagate provider details; generic safe problem; local cookie clear on logout regardless of provider result. | Map login/refresh failures to generic safe responses, never log credentials/tokens, and make logout clear local cookies even if provider revocation is unavailable. Use bounded provider calls and retain a pending live-provider gate. |

### Offline Verification and Evidence Limits

- `jose` verification is genuinely offline-testable: generate an RSA key pair in tests, expose its public key as a local JWKS fixture, sign controlled JWTs, and exercise the adapter/guard without a Supabase account. Tests should cover algorithm/key selection and all required registered claims, plus malformed bearer headers and unverified email.
- The Supabase SDK and `@supabase/ssr` session calls are only fakeable at the provider boundary for this repository. Login, refresh, logout revocation, email verification, and provider cookie semantics against a real project remain **PENDING**, not proven.
- Next.js route handlers are ordinary exported functions and can be invoked with Web `Request` objects under the existing node Vitest environment. Pure cookie/CSRF/provider helpers should receive injected dependencies; route tests can mock provider calls and API `fetch`, then assert status, `Set-Cookie`, forwarded `Authorization`, sanitized bodies, and rejection of invalid origin/CSRF. A production `next build`/smoke run is still needed for runtime integration.
- Existing API Fastify `inject()` tests provide the local HTTP pattern. No real listener, external JWKS endpoint, Supabase account, or database is required for the offline suite; claims about those live paths must remain pending.

### Recommendation

Proceed with a proposal for a two-part implementation: `jose`-based local JWT verification and a reusable Nest guard on the API, plus an `@supabase/ssr`-backed, fakeable same-origin Next.js BFF. Preserve `IdentityPort` test injection but remove its implicit lack of token context through an explicit trusted-principal boundary. Make `AUTH_ISSUER_URL`, `AUTH_JWKS_URL`, and the chosen audience contract typed server-only configuration; keep offline boot/test fakes available and production fail closed when verifier configuration is missing. Implement BFF login/logout and a sanitized session-status route, use explicit cookie/origin/CSRF contracts, and do not expand the NestJS OpenAPI surface unless a concrete downstream requirement proves it necessary.

### Risks

- Offline test JWT claims may not match the live Supabase issuer, audience, key IDs, or verified-email claim shape; the claim contract and a live compatibility gate must be explicit.
- An HttpOnly cookie prevents JavaScript access but remains a replayable bearer credential if stolen; cookie scope, Secure/SameSite settings, expiry, refresh rotation, logout behavior, and logs require adversarial tests.
- CSRF protection is currently a principle, not a selected mechanism; relying on SameSite alone could leave login/logout or future mutations vulnerable.
- `IdentityPort` currently has no request/token input. An ambient request context would create hidden coupling and concurrency risk; the proposal/design must choose an explicit guard/principal seam.
- `@supabase/ssr` integration, cookie chunking, and refresh behavior cannot be validated against a live provider without accounts; fake-provider tests can mask provider-specific behavior.
- Web route-handler tests introduce the first meaningful web server-boundary infrastructure and may expose Next/Vitest module-resolution differences.
- Adding an API session/me endpoint would churn OpenAPI and `packages/api-client`; it is not justified by the current locked surface.
- JWKS availability, rotation, cache staleness, clock skew, and configured production environment omissions can cause either unsafe acceptance or unnecessary authentication outages.

### Ready for Proposal

**Yes.** The repository and accepted ADRs provide a sufficient implementation boundary. The proposal must explicitly freeze the verifier port shape, audience source/value, cookie base name and expiry/refresh semantics, SameSite/CSRF mechanism, and whether the minimal BFF session-status route is included. It must label live Supabase authentication and provider compatibility as pending gates and include rollback for dependency/configuration and auth-wiring changes.
