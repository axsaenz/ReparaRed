export interface TrustedIdentity {
  authSubject: string;
  email: string;
  emailVerified: boolean;
}

export interface JwtVerifier {
  verify(bearer: string): Promise<TrustedIdentity>;
}

export const JWT_VERIFIER = Symbol('JWT_VERIFIER');

/** The API deliberately accepts only this frozen provider claim contract. */
export const FROZEN_AUTH_CLAIMS = ['sub', 'email', 'email_verified'] as const;

export class AuthConfigurationUnavailableError extends Error {
  constructor() {
    super('Authentication configuration is unavailable.');
    this.name = 'AuthConfigurationUnavailableError';
  }
}

export class AuthDependencyUnavailableError extends Error {
  constructor() {
    super('Authentication key dependency is unavailable.');
    this.name = 'AuthDependencyUnavailableError';
  }
}

export class InvalidTokenError extends Error {
  constructor() {
    super('The bearer token is invalid.');
    this.name = 'InvalidTokenError';
  }
}

export class UnavailableJwtVerifier implements JwtVerifier {
  async verify(bearer: string): Promise<TrustedIdentity> {
    void bearer;
    throw new AuthConfigurationUnavailableError();
  }
}
