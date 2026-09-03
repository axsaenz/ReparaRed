# Design: BFF login/session

## Technical Approach

Nest locally verifies short-lived Supabase JWTs through cached JWKS; Next route handlers own SSR cookies, provider calls, CSRF, and sanitized responses. `IdentityPort` remains the offline/export seam, while onboarding receives the guard principal in production. OpenAPI, generated artifacts, and contract scripts remain unchanged.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| API seam | `JwtVerifier` + `AuthGuard` + `@CurrentIdentity()`; guard registration now. | Ambient state/introspection | Explicit, reusable, ADR-0011-compatible; tests inject a fake guard. |
| Claims | `sub`, `email`, `email_verified=true`, required `exp`; configured issuer/audience; RS256. | Any audience or role claims | jose validates claims; role/profile stay database-owned. Live claim compatibility is pending. |
| Storage | `@supabase/ssr`, base `reparared-auth`, chunk-aware adapter. | Opaque store/provider names | Keeps App Router refresh without a session database; tokens stay server-only. |
| CSRF/cookies | `Lax` + exact Origin (Referer fallback) + `x-reparared-csrf` double-submit. Local insecure mode needs explicit flag and allowed local origin. | SameSite alone | Defends every mutation; production always forces `Secure`. |

## Data Flow

```text
Browser ── same-origin + CSRF ──> Next route ── SSR provider/cookies ──> Supabase Auth
                                      │
                                      └─ valid short bearer ──> API guard ──> onboarding command
                                                               │
                                                               └─ principal from request decorator
```

## Interfaces / Contracts

```ts
// apps/api/src/auth/jwt-verifier.port.ts
export interface TrustedIdentity {
  authSubject: string; email: string; emailVerified: boolean;
}
export interface JwtVerifier {
  verify(bearer: string): Promise<TrustedIdentity>;
}
export const JWT_VERIFIER = Symbol('JWT_VERIFIER');

// jwks.verifier.ts: constructor receives issuer, jwksUrl, audience and fetch.
export class JwksVerifier implements JwtVerifier {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  constructor(private readonly issuer: string, jwksUrl: string,
              private readonly audience: string, fetchImpl = fetch) {
    this.jwks = createRemoteJWKSet(new URL(jwksUrl), {
      cacheMaxAge: 600_000, cooldownDuration: 30_000, fetch: fetchImpl,
    });
  }
  async verify(bearer: string): Promise<TrustedIdentity> {
    const { payload } = await jwtVerify(bearer, this.jwks, {
      algorithms: ['RS256'], issuer: this.issuer, audience: this.audience,
      requiredClaims: ['exp', 'sub'],
    });
    if (typeof payload.sub !== 'string' || payload.sub.length === 0 ||
        typeof payload.email !== 'string' || payload.email.trim().length === 0 ||
        /[\u0000-\u001f\u007f]/.test(payload.email) || payload.email_verified !== true)
      throw new InvalidTokenError();
    return { authSubject: payload.sub, email: normalizeEmail(payload.email), emailVerified: true };
  }
}

// auth.guard.ts / auth.decorator.ts
@Injectable() export class AuthGuard implements CanActivate {
  constructor(@Inject(JWT_VERIFIER) private readonly verifier: JwtVerifier) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest<RequestWithIdentity>();
    const bearer = extractStrictBearer(request.headers.authorization);
    if (!bearer) throw new UnauthorizedException();
    try { request.trustedIdentity = await this.verifier.verify(bearer); return true; }
    catch (error) {
      if (error instanceof AuthDependencyUnavailableError)
        throw new ServiceUnavailableException();
      if (error instanceof AuthConfigurationUnavailableError)
        throw new UnauthorizedException(); // log fixed warning, never config values
      throw new UnauthorizedException();
    }
  }
}
export const CurrentIdentity = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<RequestWithIdentity>().trustedIdentity,
);
type RequestWithIdentity = FastifyRequest & { trustedIdentity?: TrustedIdentity };
function extractStrictBearer(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string'
    ? /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(value)?.[1]
    : undefined;
}
```

`auth.module.ts` selects `JwksVerifier` only when all three settings exist, otherwise `UnavailableJwtVerifier` fails closed. `createApp()` without options uses `AuthGuard`; its existing explicit `identityPort` option is test/export-only and selects `OfflineAuthGuard`, preserving injection tests without a production bypass. `RegistrationService.onboard(raw, principal?)` prefers the decorator principal, otherwise `IdentityPort`; the controller uses `@UseGuards(AuthGuard)` and `@CurrentIdentity()`.

API config adds optional `AUTH_ISSUER_URL: Joi.string().uri()`, `AUTH_JWKS_URL: Joi.string().uri()`, and `AUTH_AUDIENCE: Joi.string().trim().min(1)`, with getters. Partial/missing config boots offline but protected routes return 401; JWKS transport failure returns 503 `DEPENDENCY_UNAVAILABLE`. Values are never logged.

```ts
// apps/web/src/lib/auth/auth-provider.port.ts
export interface AuthSession { user: { email: string }; accessToken: string; expiresAt?: number; }
export interface AuthProvider {
  signInWithPassword(input: { email: string; password: string }): Promise<AuthSession>;
  signOut(): Promise<void>;
  getUser(): Promise<AuthSession | null>;
  refreshSession(): Promise<AuthSession | null>;
}

// cookies.ts / csrf.ts
export const AUTH_COOKIE_BASE = 'reparared-auth';
export const CSRF_COOKIE = 'reparared-csrf';
export function clearAuthCookieChunks(store: CookieStore): void; // base and base.N, expired
export function ensureCsrfCookie(store: CookieStore): void; // random 32-byte base64url
export function validateMutation(request: Request, store: CookieStore): boolean;
// validateMutation: exact allowed Origin, else Referer origin; require
// x-reparared-csrf === non-HttpOnly reparared-csrf using constant-time compare.
// SSR adapter sets Secure, HttpOnly, SameSite=Lax, Path=/ on auth chunks;
// CSRF is Secure, SameSite=Lax, Path=/, HttpOnly=false.

export async function withBearer(
  provider: AuthProvider, options: ApiClientOptions,
): Promise<ReturnType<typeof createApiClient>> {
  let session = await provider.getUser();
  if (session?.expiresAt && session.expiresAt <= Date.now() + 60_000)
    session = await provider.refreshSession();
  if (!session?.accessToken) throw new AuthenticationRequiredError();
  return createApiClient({ ...options,
    headers: { ...options.headers, Authorization: `Bearer ${session.accessToken}` },
  });
}
```

```ts
// app/api/auth/login/route.ts (normative shape)
export async function POST(request: Request): Promise<Response> {
  const store = await getCookieStore();
  if (!validateMutation(request, store)) return problem(403, 'FORBIDDEN');
  try {
    const { email, password } = await readCredentials(request);
    const session = await getAuthProvider(store).signInWithPassword({ email, password });
    return Response.json({ authenticated: true, email: session.user.email });
  } catch (error) { return mapAuthError(error); } // 401/503; never provider detail
}
// app/api/auth/logout/route.ts
export async function POST(request: Request): Promise<Response> {
  const store = await getCookieStore();
  if (!validateMutation(request, store)) return problem(403, 'FORBIDDEN');
  try { await getAuthProvider(store).signOut(); }
  catch { /* generic result; provider details are not exposed */ }
  finally { clearAuthCookieChunks(store); }
  return Response.json({ authenticated: false });
}
// app/api/auth/session/route.ts
export async function GET(): Promise<Response> {
  const store = await getCookieStore(); ensureCsrfCookie(store);
  try {
    let session = await getAuthProvider(store).getUser();
    if (session?.expiresAt && session.expiresAt <= Date.now() + 60_000)
      session = await getAuthProvider(store).refreshSession();
    return Response.json(session ? { authenticated: true, email: session.user.email }
                                : { authenticated: false });
  } catch (error) { return mapAuthError(error); }
}
```

`supabase.provider.ts` is server-only and wraps `createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, ...)`; calls time out at 5 seconds and expose generic error kinds. Login/logout validate before provider work and return only sanitized state: invalid credentials 401, provider failure 503, origin/CSRF 403. Logout clears chunks in `finally`; session refreshes at 60 seconds and never serializes `accessToken`. `ALLOWED_ORIGINS` and `ALLOW_INSECURE_LOCAL_COOKIES` are server-only policy settings; production ignores the insecure flag.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/src/auth/*` | Create | Port, cached JWKS verifier, guard/decorator/module, tests. |
| API registration/app/config files | Modify | Re-export identity, pass explicit principal, wire module, add typed settings. |
| `apps/web/src/lib/auth/*` and auth route handlers/tests | Create | Provider, cookies, CSRF, forwarding, BFF. |
| Manifests and lockfile | Modify | Add jose 6.2.10, SSR 0.12.5, Supabase JS 2.114.0, client dependency. |
| Env examples and `docs/environments.md` | Modify | Mark consumed server-only auth/provider/policy names; blank values. |
| OpenAPI/generated artifacts and contract scripts | N/A | No Nest session endpoint or contract surface is added. |

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| API unit | `jwks-verifier.spec.ts`: RSA/JWKS valid and signature/kid/issuer/audience/exp/sub/email failures; malformed bearer. | Generated fixture using node crypto/jose. |
| API integration | `auth.guard.spec.ts` and guarded `inject()` route: 401 absent/config, 503 unreachable, 200 principal, forged body. | Mock verifier/fake port; export remains offline. |
| Web unit | Each auth route `route.spec.ts`, provider fake, and forwarding: flags/chunks, logout clear-on-throw, 403-before-provider, sanitized body, Authorization header. | Node Vitest Web `Request`; mocked provider/fetch. |
| Regression | Registration/env/export/contracts | Existing suites; assert no contract diff. |

## Threat Matrix

| Boundary | Applicability | Safe/failure behavior | Planned RED test |
|---|---|---|---|
| Bearer/principal trust | Applicable | Strict bearer; invalid/missing 401; guard-only principal; body identity ignored. | Forged body plus valid token shape uses token identity. |
| Secrets | Applicable | No token/credential in logs or responses; auth HttpOnly, CSRF readable only. | Scan bodies/logs; assert cookie flags and no tokens. |
| Log injection | Applicable | Never log bearer; normalize/reject control characters; fixed warning. | Malicious email/header yields no injected line. |
| CSRF/origin routing | Applicable | Allowlist + matching header/cookie before provider; reject 403. | Missing/forged mutation proves zero provider calls. |
| SQL injection | N/A — no new raw SQL; onboarding retains existing parameterized query. | No new database boundary. | None. |
| Documentation-like paths | N/A — no executable documentation classification. | No execution. | None. |
| Git repository selection | N/A — no Git command or repository selector. | No repository mutation. | None. |
| Commit state | N/A — no VCS automation; commit state remains apply-owned. | No implementation-side commit. | None. |
| Push state | N/A — push is outside this change. | No push performed. | None. |
| PR commands | N/A — PR is outside this change. | No PR command. | None. |

## Migration / Rollout

One commit: code, tests, dependency/lockfile refresh, and env/docs classification together. Deploy with auth settings absent only for offline/public boot; protected routes remain fail-closed. Live Supabase sign-in/refresh/revocation, claim compatibility, PostgreSQL, production `next build` smoke, and deployment remain pending gates. Rollback is a revert; `IdentityPort` returns to fail-closed production behavior.

## Open Questions

None. The claim names are frozen as `sub`, `email`, and `email_verified`; live compatibility is a release gate, not a design question.
