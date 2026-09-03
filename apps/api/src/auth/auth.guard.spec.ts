import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AuthGuard } from './auth.guard';
import {
  AuthConfigurationUnavailableError,
  AuthDependencyUnavailableError,
  type JwtVerifier,
  type TrustedIdentity,
  UnavailableJwtVerifier,
} from './jwt-verifier.port';

const identity: TrustedIdentity = {
  authSubject: 'subject-1',
  email: 'user@example.test',
  emailVerified: true,
};

describe('AuthGuard', () => {
  it('requires an exact compact Bearer token', async () => {
    const verifier = { verify: vi.fn() } satisfies JwtVerifier;
    const guard = new AuthGuard(verifier);
    const request = { headers: { authorization: 'Bearer malformed' } };

    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it('attaches the verifier identity and never trusts request body identity', async () => {
    const verifier = {
      verify: vi.fn().mockResolvedValue(identity),
    } satisfies JwtVerifier;
    const request = {
      headers: { authorization: 'Bearer a.b.c' },
      body: {
        authSubject: 'forged-body-subject',
        email: 'attacker@example.test',
      },
    } as Record<string, unknown>;
    const guard = new AuthGuard(verifier);

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.trustedIdentity).toEqual(identity);
    expect(request.body).toMatchObject({ authSubject: 'forged-body-subject' });
    expect(verifier.verify).toHaveBeenCalledWith('a.b.c');
  });

  it('fails closed when configuration is absent', async () => {
    const guard = new AuthGuard(new UnavailableJwtVerifier());
    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: 'Bearer a.b.c' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns dependency unavailable for an unreachable JWKS', async () => {
    const verifier = {
      verify: vi.fn().mockRejectedValue(new AuthDependencyUnavailableError()),
    } satisfies JwtVerifier;
    const guard = new AuthGuard(verifier);
    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: 'Bearer a.b.c' } }),
      ),
    ).rejects.toMatchObject({ status: 503 });
  });

  it('maps configuration errors to authentication required', async () => {
    const verifier = {
      verify: vi
        .fn()
        .mockRejectedValue(new AuthConfigurationUnavailableError()),
    } satisfies JwtVerifier;
    const guard = new AuthGuard(verifier);
    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: 'Bearer a.b.c' } }),
      ),
    ).rejects.toMatchObject({ status: 401 });
  });
});

function contextFor(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}
