import { createRemoteJWKSet, customFetch, jwtVerify } from 'jose';
import {
  AuthDependencyUnavailableError,
  InvalidTokenError,
  type JwtVerifier,
  type TrustedIdentity,
} from './jwt-verifier.port';

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

export class JwksVerifier implements JwtVerifier {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    private readonly issuer: string,
    jwksUrl: string,
    private readonly audience: string,
    fetchImpl: typeof fetch = fetch,
  ) {
    this.jwks = createRemoteJWKSet(new URL(jwksUrl), {
      cacheMaxAge: 600_000,
      cooldownDuration: 30_000,
      [customFetch]: fetchImpl,
    });
  }

  async verify(bearer: string): Promise<TrustedIdentity> {
    try {
      const { payload } = await jwtVerify(bearer, this.jwks, {
        algorithms: ['RS256'],
        issuer: this.issuer,
        audience: this.audience,
        requiredClaims: ['exp', 'sub'],
      });

      if (
        typeof payload.sub !== 'string' ||
        payload.sub.length === 0 ||
        CONTROL_CHARACTER_PATTERN.test(payload.sub) ||
        typeof payload.email !== 'string' ||
        payload.email.trim().length === 0 ||
        CONTROL_CHARACTER_PATTERN.test(payload.email) ||
        payload.email_verified !== true
      ) {
        throw new InvalidTokenError();
      }

      return {
        authSubject: payload.sub,
        email: normalizeEmail(payload.email),
        emailVerified: true,
      };
    } catch (error) {
      if (error instanceof InvalidTokenError) throw error;
      if (isDependencyError(error)) throw new AuthDependencyUnavailableError();
      throw new InvalidTokenError();
    }
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isDependencyError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === 'JWKSTimeout' ||
    error.name === 'JWKSServerError' ||
    error.name === 'JWKInvalid' ||
    error.name === 'AbortError' ||
    error.name === 'FetchError' ||
    error.name === 'ECONNREFUSED' ||
    error.name === 'ENOTFOUND' ||
    error.name === 'EAI_AGAIN' ||
    error.message.toLowerCase().includes('fetch failed')
  );
}

export function strictBearer(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value !== 'string') return undefined;
  return /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(
    value,
  )?.[1];
}
