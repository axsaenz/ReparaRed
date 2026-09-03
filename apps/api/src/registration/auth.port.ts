import { UnauthorizedException } from '@nestjs/common';

export const IDENTITY_PORT = Symbol('IDENTITY_PORT');

export interface TrustedIdentity {
  authSubject: string;
  email: string;
  emailVerified: boolean;
}

export interface IdentityPort {
  getVerifiedIdentity(): Promise<TrustedIdentity>;
}

export class UnavailableIdentityPort implements IdentityPort {
  async getVerifiedIdentity(): Promise<TrustedIdentity> {
    throw new UnauthorizedException();
  }
}

export class FakeIdentityPort implements IdentityPort {
  constructor(
    private readonly identity: TrustedIdentity = {
      authSubject: 'export-subject',
      email: 'export@example.test',
      emailVerified: true,
    },
  ) {}

  async getVerifiedIdentity(): Promise<TrustedIdentity> {
    return this.identity;
  }
}
