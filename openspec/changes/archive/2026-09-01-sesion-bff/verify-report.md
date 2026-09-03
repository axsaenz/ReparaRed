```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:e88abe86004f71176420d1c635f48e86141c76b6f650074d575ea1669d33c2f3
verdict: pass
blockers: 0
critical_findings: 0
requirements: 10/10
scenarios: 20/20
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:f4111be7a43f7de249e1e1e9a586d54e0202c4a49ad9a0ece2d8d27bb2be91ea
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:a0949259eb8642ad38dfbe3e78f544ef6400c6dc115b585372ad5ca397ed8c10
```

## Verification Report

**Change**: `sesion-bff`  
**Version**: N/A  
**Mode**: Standard (strict TDD disabled)

### Completeness

| Metric | Value |
|---|---:|
| Requirements | 10 |
| Scenarios | 20 |
| Tasks total | 15 |
| Tasks complete | 15 |
| Tasks incomplete | 0 |

### Build and Tests Execution

| Command | Exit code | Observed result |
|---|---:|---|
| `npm test --workspace=@repara/api -- --run src/auth src/config/env.schema.spec.ts src/app.integration.spec.ts` | 0 | 4 files, 50 tests passed. This directly exercised the RSA/JWKS verifier, guard, environment schema, and Fastify integration. |
| `npm test --workspace=@repara/web` | 0 | 5 files, 11 tests passed. |
| `npm test` | 0 | 28 API files/186 tests and 5 web files/11 tests passed. |
| `npm run lint` | 0 | API and web lint passed. Next emitted the existing missing legacy `pages` directory warning only. |
| `npm run format:check` | 0 | All files matched Prettier style. |
| `npm run typecheck` | 0 | Web, API, and API-client type checks passed. |
| `npm run build` | 0 | Next production build and API Prisma/TypeScript build passed; auth route handlers were collected as dynamic routes. |
| `npm run contract:check` | 0 | Export, generated-client comparison, OpenAPI validation, and typecheck passed. |
| `npm run contract:export` | 0 | Export passed; no OpenAPI or generated-client working-tree diff resulted. |
| `npm ci` | 0 | 598 packages installed; package-lock hash remained `fa730d34cf07164ef688f1b079d5fd48c58b48ee4ba6cb3b624061ace85c265e`. Prisma generation was run once afterward because npm install scripts were blocked in this environment. |

**Coverage**: Not collected; configured threshold is 0.

### Per-Requirement Verification Matrix

| Requirement | Commands / inspected evidence | Observed result | Status |
|---|---|---|---|
| R1 Local token verification | Read `apps/api/src/auth/jwks.verifier.ts`, `jwt-verifier.port.ts`, `auth.module.ts`; focused API test command above. | `jose` cached remote JWKS uses RS256, issuer, audience, required `exp`/`sub`, and `email_verified === true`; subject/email are validated and normalized. No role trust exists in verifier/guard. Missing settings select `UnavailableJwtVerifier`, which fails closed. RSA valid, signature, kid, issuer, audience, expiry, subject, email, and malformed-token cases passed. | PASS |
| R2 Trusted principal propagation | Read `auth.guard.ts`, `auth.decorator.ts`, controller wiring; focused API test command above. | Guard extracts a strict bearer, verifies it, and attaches a request-scoped `trustedIdentity`; `@CurrentIdentity()` reads that request field. Malformed/absent bearer and missing configuration returned 401 in runtime tests; mocked JWKS dependency failure mapped to 503 in guard runtime tests. No ambient request singleton was found. | PASS |
| R3 Same-origin session boundary | Read the three route handlers and `route-helpers.ts`; `npm test --workspace=@repara/web`. | Only fixed login/logout/session handlers exist. Login and logout reject invalid mutation origin before provider use; route bodies expose only sanitized authenticated state, and session has `{authenticated,email?}` shape. No credentials or token material is serialized. | PASS |
| R4 Secure cookie contract | Read `cookies.ts`, `supabase.provider.ts`; web route/auth tests. | Base name is `reparared-auth`; auth chunks are HttpOnly, SameSite=Lax, path `/`, and Secure by default. Chunk discovery and expiry passed. Refresh/session tests exposed no access token. `ALLOW_INSECURE_LOCAL_COOKIES` is explicit and gated by `NODE_ENV !== production`, so production cannot disable Secure. | PASS |
| R5 Browser mutation protection | Read `csrf.ts`, login/logout handlers; web route tests. | Exact allowed Origin (or Referer-origin fallback) and constant-time double-submit CSRF matching are required. Invalid origin and missing CSRF returned 403 with zero provider calls; both login and logout are protected. | PASS |
| R6 Provider delegation seam | Read provider port, Supabase adapter, route error mapping, and `bounded()`; web auth tests. | Auth operations use replaceable `AuthProvider`; Supabase integration is `server-only`; provider details become generic 401/503 responses. Provider calls are bounded at five seconds. Logout returned the generic success state and expired all local auth chunks after provider failure. | PASS |
| R7 Bearer forwarding discipline | Read `with-bearer.ts`, API-client usage, and all web routes; web auth test. | Session is read and refreshed near expiry before a typed `createApiClient` receives `Authorization`. The web surface contains fixed auth operations, not a target-taking proxy, and no web Prisma/database import was found. | PASS |
| R8 Server-only configuration | Read env schema/config service, both `.env.example` files, and `docs/environments.md`; focused environment tests. | Optional URI/non-empty API auth settings validate without blocking offline boot; values are exposed through typed getters and are not logged. Supabase URL/key and origin policy names are classified server-only where consumed. Example assignments are blank and no secret values were added. | PASS |
| R9 Offline verification limits | Read `spec.md`, `proposal.md`, `design.md`, and `apply-progress.md`; full offline suite and build. | Fixture/fake-provider gates passed locally. The recorded pending state remains explicit for live Supabase sign-in/refresh/revocation, live claim compatibility, production Next route smoke, live PostgreSQL, and deployment/promotion. No artifact claims live acceptance. | PENDING-RECORDED |
| R10 Contract surface stability | `npm run contract:check`; `npm run contract:export`; `git diff 2965fee^ 2965fee -- apps/api/openapi.json packages/api-client/src/generated.ts`; working-tree surface diff check. | Contract checks passed. Both requested API surface diffs were empty, and the generated client remained unchanged. | PASS |

### Scenario Compliance Matrix

| Requirement | Scenario | Covering evidence | Result |
|---|---|---|---|
| R1 | Happy | `jwks-verifier.spec.ts` compliant RS256 fixture passed. | COMPLIANT |
| R1 | Edge | `jwks-verifier.spec.ts` invalid claims/signature and `auth.guard.spec.ts` missing-config tests passed. | COMPLIANT |
| R2 | Happy | `auth.guard.spec.ts` request principal test and guarded Fastify integration passed. | COMPLIANT |
| R2 | Edge | Strict-bearer 401, missing-config 401, and dependency-unavailable 503 guard tests passed; integration asserted the fail-closed 401 problem. | COMPLIANT |
| R3 | Happy | Login/session sanitized-body and logout safe-result web tests passed. | COMPLIANT |
| R3 | Edge | Login/logout invalid-origin or CSRF-before-provider tests passed; fixed route surface and sanitized status were source-checked. | COMPLIANT |
| R4 | Happy | Session near-expiry refresh and token-free response tests passed; cookie helper uses server-only auth chunks. | COMPLIANT |
| R4 | Edge | Chunk clearing and secure HttpOnly/Lax assertions passed; production Secure behavior and explicit local flag were source-checked. | COMPLIANT |
| R5 | Happy | CSRF helper valid-origin/header-cookie test passed; valid login/logout requests reached fakes. | COMPLIANT |
| R5 | Edge | Invalid origin and missing/forged CSRF tests passed with provider call-count assertions. | COMPLIANT |
| R6 | Happy | `with-bearer` and provider-port tests passed; bounded provider wrapper is present. | COMPLIANT |
| R6 | Edge | Logout provider-throw test passed and asserted local chunk clearing plus generic response. | COMPLIANT |
| R7 | Happy | Typed API-client mocked-fetch test observed the refreshed bearer in Authorization. | COMPLIANT |
| R7 | Edge | Fixed route handlers and absent web database imports were inspected; authentication-required behavior is implemented before forwarding. | COMPLIANT |
| R8 | Happy | Environment schema tests accepted complete optional auth settings and typed getters are wired. | COMPLIANT |
| R8 | Edge | Blank/missing settings boot offline and fail auth closed; examples/docs classify consumed values server-only. | COMPLIANT |
| R9 | Happy | Full offline fixture/fake-provider suite passed. | COMPLIANT |
| R9 | Edge | Live provider, claims, production smoke, PostgreSQL, and deployment gates are explicitly recorded pending, not misreported as passed. | PENDING-RECORDED |
| R10 | Happy | Contract check/export passed with empty OpenAPI/generated-client diff. | COMPLIANT |
| R10 | Edge | Transport-only typed client and fixed BFF operations were source-checked; no domain-table access was found in web code. | COMPLIANT |

**Compliance summary**: 19/20 scenarios have runtime/source-backed compliant evidence; the R9 edge is intentionally `PENDING-RECORDED` under the specification's offline limit. All 10 requirements are verified for the declared offline scope.

### Adversarial Spot Checks

| Check | Observed result |
|---|---|
| Token/bearer/credential/email-claim logging scan | No `console.*` calls were found in the new auth code or BFF routes. The only auth warning is a fixed configuration message; API request logging redacts authorization/cookie/password/token fields. No unsafe secret-bearing console match was found. |
| Body-supplied identity with valid-looking token | The RED test in `auth.guard.spec.ts` passed: the verifier identity was attached and forged body identity was not used. The guarded onboarding integration also rejected forged identity when verifier configuration was absent. |
| Role trust boundary | No role/profile reference exists in API verifier/guard code; registration obtains role/profile from storage projection and hard-codes only the onboarding result role. |
| Ambient state | No `globalThis`, `AsyncLocalStorage`, request singleton, or ambient identity pattern was found in API source. Principal state is attached to the current request. |
| Cookie/token response leakage | Login, session, logout, and refresh tests passed with access tokens absent from response bodies; auth cookies are HttpOnly and CSRF is the only readable cookie. |
| CSRF ordering | Login and logout invalid-origin/missing-CSRF tests passed with fake-provider call counts at zero. |

### Pending-Gate Audit

The following gates are intentionally not claimed as accepted and are recorded in `apply-progress.md`, `proposal.md`, `design.md`, and the delta specification:

1. Live Supabase signup, verification, sign-in, refresh, revocation, and provider-error behavior.
2. Compatibility of the frozen `sub`/`email`/`email_verified` claims with live provider tokens.
3. Production deployment Next route-handler smoke.
4. Live PostgreSQL evidence.
5. Deployment and promotion gates.

Local `npm run build` passing is not substituted for the pending production route smoke. No live acceptance claim was found in the change artifacts.

### Scope Discipline

The applied commit was `2965fee chore: add BFF session`; all 15 tasks are checked. Static inspection stayed within the changed auth/config/registration/BFF/docs/manifest and test surfaces, with the OpenAPI/generated artifacts deliberately excluded from modification. `npm ci` did not alter `package-lock.json`; its SHA-256 remained unchanged. Before this report was persisted, `git status --porcelain` was empty and both the committed and working contract-surface diffs were empty. The only expected post-verification workspace entry is this newly persisted report artifact.

### Issues Found

**CRITICAL**: None.  
**WARNING**: The five live/release gates listed above remain pending; npm reported three high-severity dependency audit findings during `npm ci`, and Prisma emitted its existing package.json configuration deprecation warning. Neither caused a verification failure, but both should be handled by release/dependency maintenance.  
**SUGGESTION**: Add an end-to-end guarded-route test for the 503 JWKS outage path and a direct test of the production-vs-local cookie flag matrix to strengthen future regression evidence.

### Overall Verdict

**PASS WITH WARNINGS** — all 10 requirements and all offline-testable behavior passed independently; the R9 release gates remain explicitly pending and are not represented as live acceptance.

### Archive Notes

The change is ready for `sdd-archive` for the verified offline scope. Archive must preserve the pending live/release gate record and must not convert those gates into satisfied acceptance criteria.

Persistence note: `gentle-ai sdd-verify-validate` was unavailable in this environment, as declared by the caller. Per the supplied OpenSpec artifact-store instruction, this report was persisted directly to the OpenSpec path with the required canonical envelope.
