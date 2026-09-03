# Pre-Proposal State — gentle-ai.sdd-preproposal/v1

- revision: 1
- status: confirmed
- exploration: `openspec/changes/sesion-bff/exploration.md`
- research: unselected
- proposal_ready: true
- confirmed_by: orchestrator (auto mode mandate 2026-09-01 — recommended options auto-selected)

## Confirmed product decisions

| # | Decision | Confirmed value |
|---|----------|-----------------|
| 1 | verifier_port_shape | `separate-jwt-verifier-guard` — new JwtVerifier port (jose JWKS) + reusable Nest auth guard providing a request-bound trusted principal; IdentityPort preserved for offline fakes; NO ambient global request state; registration consumes explicit trusted principal |
| 2 | jwt_claims | `auth-audience-required` — server-only AUTH_AUDIENCE required; reject bad signature/issuer/audience/sub/exp; verified-email claim required for TrustedIdentity; role NEVER trusted from token metadata (DB loads it per TD §8.1) |
| 3 | token_storage | `supabase-ssr-wrapper` — @supabase/ssr behind a project-owned fakeable wrapper; access/refresh tokens server-only in HttpOnly cookies; server-side refresh; NO session database |
| 4 | cookie_contract | `project-owned-base-name` — stable base `reparared-auth` (documented chunking); Secure + HttpOnly + explicit SameSite; local test exceptions explicit, never production defaults |
| 5 | duration_refresh | `bounded-short-access-policy` — short-lived access aligned with provider session/refresh contract; refresh before expiry with clock-skew margin; refresh material NEVER exposed to JavaScript |
| 6 | csrf | `samesite-lax-origin-custom-header` — SameSite=Lax + strict allowed-origin validation (Origin/Referer) + custom CSRF header (double-submit token) on EVERY browser-originated BFF mutation incl. login/logout; never SameSite alone |
| 7 | session_read_surface | `minimal-bff-session-route` — same-origin GET /api/auth/session returning sanitized auth state (downstream UI needs it); NO NestJS session/me endpoint (not locked; /me/profile belongs to #14) |
| 8 | provider_failure | `generic-safe-plus-local-clear` — generic safe problem responses; never log credentials/tokens; logout clears local cookies even if provider revocation unavailable; bounded provider calls |

## Locked constraints (binding, verbatim from ADR-0006/0011 + TECH-DESIGN §3.3/§7.2/§8.1)

- Next.js = session BFF: browser talks ONLY to same origin (login/logout/private data); Secure/HttpOnly/explicit-SameSite cookies; route handlers renew server-side + forward SHORT-LIVED bearer in Authorization to NestJS (ADR-0011).
- Route handlers = explicit adapters consuming the OpenAPI-derived client; no open proxy; no direct domain-table access; no duplicated authorization/business rules; Nest verifies every token = final authority (ADR-0011).
- Browser-originated mutations: origin check + CSRF protection per cookie config (ADR-0011).
- Auth exposed at Next same-origin, delegates to Supabase Auth; Nest receives server-to-server tokens only (TD §7.2).
- Nest validates JWT signature via JWKS + issuer + audience + expiration + subject; then loads role/profile from PostgreSQL (TD §8.1).
- Supabase Auth owns credentials/sessions/recovery/token issuance (ADR-0006).

## Dependency candidates (registry 2026-09-03, verified)

- API runtime: `jose 6.2.10` (JWKS verification; offline-testable with generated RSA keys).
- Web runtime: `@supabase/ssr 0.12.5` + `@supabase/supabase-js 2.114.0` (server-only BFF wrapper; fakeable boundary).
- Env consumed NOW (server-only): API — AUTH_ISSUER_URL, AUTH_JWKS_URL, AUTH_AUDIENCE; WEB (BFF server-side) — SUPABASE_URL, SUPABASE_ANON_KEY (auth client config; not privileged to DB/Storage per TD §12.3).

## Capability impact (binding)

NEW capability `bff-session` (API JWT adapter/guard + BFF login/logout/session + cookie/CSRF contracts + provider wrapper seam). NO API OpenAPI surface change (BFF routes are web-side) — contract artifacts unchanged.

## Scope boundary (binding)

IN: API jwt adapter + guard + principal + env extension + offline RSA/JWKS tests; WEB /api/auth/login + logout + session routes + cookie helpers + CSRF/origin checks + Supabase wrapper (fakeable) + route tests; docs/environments.md + .env.example updates (future→consumed); dep installs + lockfile. OUT: live Supabase flows (pending gate), login/register UI pages, private UI layouts, profile editing (#14/#15), request form (#18), password recovery, NestJS /me endpoints, rate limiting, monitoring, privileged Vercel DB/Storage credentials.

## Carried forward (binding)

Pending gates: live Supabase provisioning + real auth flows + provider claim compatibility (test keys ≠ live claims — compatibility gate explicit); live PostgreSQL evidence; deployment gates. Offline evidence = jose with test RSA/JWKS fixtures + fake provider boundary ONLY.
