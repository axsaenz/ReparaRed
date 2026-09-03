import { describe, expect, it, vi } from 'vitest';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { JwksVerifier, strictBearer } from './jwks.verifier';
import { InvalidTokenError } from './jwt-verifier.port';

const issuer = 'https://auth.example.test';
const audience = 'reparared-api';

describe('JwksVerifier', () => {
  it('returns a trusted identity for a compliant RS256 token', async () => {
    const fixture = await createFixture();
    const token = await fixture.token({
      email: ' Alex@Example.COM ',
      email_verified: true,
    });

    await expect(fixture.verifier.verify(token)).resolves.toEqual({
      authSubject: 'subject-1',
      email: 'alex@example.com',
      emailVerified: true,
    });
  });

  it.each([
    [
      'bad signature',
      async () => {
        const { privateKey } = await generateKeyPair('RS256');
        return new SignJWT(claims())
          .setProtectedHeader({ alg: 'RS256', kid: 'key-1' })
          .setIssuer(issuer)
          .setAudience(audience)
          .setIssuedAt()
          .setExpirationTime('5m')
          .sign(privateKey);
      },
    ],
    ['bad kid', async (fixture: Fixture) => fixture.token({}, 'unknown-key')],
    [
      'bad issuer',
      async (fixture: Fixture) =>
        fixture.token({}, 'key-1', 'https://evil.test'),
    ],
    [
      'bad audience',
      async (fixture: Fixture) =>
        fixture.token({}, 'key-1', issuer, 'other-api'),
    ],
    [
      'expired',
      async (fixture: Fixture) =>
        fixture.token({}, 'key-1', issuer, audience, -1),
    ],
    [
      'missing subject',
      async (fixture: Fixture) => fixture.token({ sub: undefined }),
    ],
    [
      'unverified email',
      async (fixture: Fixture) => fixture.token({ email_verified: false }),
    ],
    [
      'control character in email',
      async (fixture: Fixture) =>
        fixture.token({ email: 'bad\n@example.test' }),
    ],
  ])('rejects %s', async (_name, buildToken) => {
    const fixture = await createFixture();
    await expect(
      fixture.verifier.verify(await buildToken(fixture)),
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('maps a JWKS transport failure to dependency unavailability', async () => {
    const fixture = await createFixture(new Error('fetch failed'));
    await expect(
      fixture.verifier.verify(await fixture.token()),
    ).rejects.toMatchObject({
      name: 'AuthDependencyUnavailableError',
    });
  });
});

describe('strict bearer extraction', () => {
  it.each([
    undefined,
    '',
    'Basic abc',
    'Bearer abc',
    'Bearer a.b.c.extra',
    'Bearer a.b.c\n',
    ['Bearer a.b.c'],
  ])('rejects malformed authorization value %s', (value) => {
    expect(
      strictBearer(value as string | string[] | undefined),
    ).toBeUndefined();
  });

  it('accepts only a compact token with the exact Bearer scheme', () => {
    expect(
      strictBearer('Bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxIn0.signature'),
    ).toBe('eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxIn0.signature');
  });
});

type Fixture = Awaited<ReturnType<typeof createFixture>>;

async function createFixture(failure?: Error) {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const publicJwk = await exportJWK(publicKey);
  const fetchImpl = vi.fn<typeof fetch>(async () => {
    if (failure) throw failure;
    return new Response(
      JSON.stringify({ keys: [{ ...publicJwk, kid: 'key-1', alg: 'RS256' }] }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  });
  return {
    privateKey,
    verifier: new JwksVerifier(
      issuer,
      'https://keys.example.test/jwks',
      audience,
      fetchImpl,
    ),
    token: async (
      overrides: Record<string, unknown> = {},
      kid = 'key-1',
      tokenIssuer = issuer,
      tokenAudience = audience,
      expiration = 300,
    ) => {
      const payload = { ...claims(), ...overrides };
      delete payload.sub;
      const builder = new SignJWT(payload)
        .setProtectedHeader({ alg: 'RS256', kid })
        .setIssuer(tokenIssuer)
        .setAudience(tokenAudience)
        .setIssuedAt();
      if (overrides.sub !== undefined)
        builder.setSubject(String(overrides.sub));
      else if (!('sub' in overrides)) builder.setSubject('subject-1');
      return builder
        .setExpirationTime(Math.floor(Date.now() / 1000) + expiration)
        .sign(privateKey);
    },
  };
}

function claims(): Record<string, unknown> {
  return { email: 'user@example.test', email_verified: true };
}
