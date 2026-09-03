import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { FakeIdentityPort, UnavailableIdentityPort } from './auth.port';

describe('identity port adapters', () => {
  it('returns a verified context from the explicit offline fake', async () => {
    const identity = {
      authSubject: 'subject-1',
      email: 'person@example.test',
      emailVerified: true,
    };

    await expect(
      new FakeIdentityPort(identity).getVerifiedIdentity(),
    ).resolves.toEqual(identity);
  });

  it('can represent an unverified provider context without reading configuration', async () => {
    const port = new FakeIdentityPort({
      authSubject: 'subject-2',
      email: 'person@example.test',
      emailVerified: false,
    });

    await expect(port.getVerifiedIdentity()).resolves.toMatchObject({
      emailVerified: false,
    });
  });

  it('fails closed when the live adapter is unavailable', async () => {
    await expect(
      new UnavailableIdentityPort().getVerifiedIdentity(),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
