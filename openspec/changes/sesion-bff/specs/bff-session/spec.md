# bff-session Specification

## Purpose

Define token trust and same-origin BFF sessions. Offline evidence; live gates pending.

## Requirements

### Requirement: Local token verification

API MUST locally verify bearer against published keys: signature, issuer, audience, expiry, subject, and verified email. Storage owns role/profile; missing config fails closed.

#### Scenario: Happy
- GIVEN compliant token
- WHEN protected request arrives
- THEN trust identity; storage supplies role/profile.

#### Scenario: Edge
- GIVEN invalid config or unverified email
- WHEN verification runs
- THEN reject; create no trusted identity.

### Requirement: Trusted principal propagation

Protected requests MUST expose subject/email through a reusable explicit guard; ambient request state MUST NOT be used.

#### Scenario: Happy
- GIVEN valid bearer
- WHEN guard runs
- THEN handler gets request principal.

#### Scenario: Edge
- GIVEN malformed bearer or unavailable keys
- WHEN guard runs
- THEN return 401 AUTHENTICATION_REQUIRED or 503 DEPENDENCY_UNAVAILABLE.

### Requirement: Same-origin session boundary

BFF MUST offer same-origin login/logout/status only; responses MUST omit tokens/credentials and sanitize status.

#### Scenario: Happy
- GIVEN allowed same-origin request
- WHEN session operation runs
- THEN return safe result only.

#### Scenario: Edge
- GIVEN cross-origin request
- WHEN route handles it
- THEN reject; expose none.

### Requirement: Secure cookie contract

Cookies MUST use `reparared-auth`, Secure, HttpOnly, SameSite=Lax. Access MUST be short-lived/bounded and server-renewed; refresh stays server-only.

#### Scenario: Happy
- GIVEN session near expiry
- WHEN server renews
- THEN scripts see no refresh material.

#### Scenario: Edge
- GIVEN explicit local exception
- WHEN enabled
- THEN production secure defaults remain.

### Requirement: Browser mutation protection

Every browser mutation MUST validate allowed origin and custom CSRF header/token before provider/storage; includes login/logout/future. SameSite alone MUST NOT suffice.

#### Scenario: Happy
- GIVEN valid origin and CSRF
- WHEN mutation arrives
- THEN provider may be called.

#### Scenario: Edge
- GIVEN invalid origin or CSRF
- WHEN mutation arrives
- THEN reject before provider/storage.

### Requirement: Provider delegation seam

Sign-in/renewal/sign-out/user-read MUST use replaceable bounded provider port. Failures MUST be generic; secrets MUST NOT be logged; logout MUST clear cookies.

#### Scenario: Happy
- GIVEN provider operation
- WHEN invoked
- THEN call bounded provider port.

#### Scenario: Edge
- GIVEN provider logout failure/timeout
- WHEN logout completes
- THEN generic result; clear cookies.

### Requirement: Bearer forwarding discipline

BFF MUST validate session before forwarding short-lived bearer through typed client. It MUST NOT be an open proxy, access domain tables, or duplicate authorization/business rules.

#### Scenario: Happy
- GIVEN valid session and operation
- WHEN BFF forwards
- THEN typed client sends bearer.

#### Scenario: Edge
- GIVEN invalid session/arbitrary target
- WHEN forwarding is requested
- THEN no API call or direct access.

### Requirement: Server-only configuration

Verifier/provider config MUST be typed, validated, server-only, uncommitted. Missing verifier config permits offline boot but fails auth; docs MUST classify consumed names by environment. Consumed names are `AUTH_ISSUER_URL`, `AUTH_JWKS_URL`, `AUTH_AUDIENCE`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.

#### Scenario: Happy
- GIVEN valid server-only config
- WHEN it is validated
- THEN auth receives typed settings.

#### Scenario: Edge
- GIVEN missing verifier/repository secret
- WHEN checks run
- THEN boot offline, close auth, commit nothing.

### Requirement: Offline verification limits

Fixtures/fake provider MUST verify tokens, guards, cookies, CSRF, and BFF routes offline. Live sign-in/renewal/revocation, claim compatibility, build, and deployment MUST remain pending.

#### Scenario: Happy
- GIVEN fixtures and fake provider
- WHEN offline suite runs
- THEN local contracts verify.

#### Scenario: Edge
- GIVEN live evidence unavailable
- WHEN results report
- THEN gates remain pending.

### Requirement: Contract surface stability

Capability MUST NOT change published OpenAPI/generated artifacts. BFF routes are web-origin; contract-derived typed client MUST remain transport-only.

#### Scenario: Happy
- GIVEN BFF routes added
- WHEN contracts are inspected
- THEN artifacts remain unchanged.

#### Scenario: Edge
- GIVEN future domain request
- WHEN typed client is used
- THEN it adds no business/authorization rules.
