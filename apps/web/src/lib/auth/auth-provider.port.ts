export interface AuthSession {
  user: { email: string };
  accessToken: string;
  /** Milliseconds since the Unix epoch. */
  expiresAt?: number;
}

export interface AuthProvider {
  signInWithPassword(input: {
    email: string;
    password: string;
  }): Promise<AuthSession>;
  signOut(): Promise<void>;
  getUser(): Promise<AuthSession | null>;
  refreshSession(): Promise<AuthSession | null>;
}

export type AuthProviderErrorKind = 'invalid-credentials' | 'dependency';

export class AuthProviderError extends Error {
  constructor(readonly kind: AuthProviderErrorKind) {
    super('Authentication provider operation failed.');
    this.name = 'AuthProviderError';
  }
}

export class AuthInputError extends Error {
  constructor() {
    super('Authentication input is invalid.');
    this.name = 'AuthInputError';
  }
}

export class AuthenticationRequiredError extends Error {
  constructor() {
    super('Authentication is required.');
    this.name = 'AuthenticationRequiredError';
  }
}
