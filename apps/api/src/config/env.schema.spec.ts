import { describe, expect, it } from 'vitest';
import { envSchema, validateEnvironment } from './env.schema';

describe('environment schema', () => {
  it('applies safe defaults when consumed values are absent', () => {
    const result = validateEnvironment({});

    expect(result).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      HOST: '0.0.0.0',
      LOG_LEVEL: 'info',
    });
  });

  it('allows unrelated platform keys without stripping them', () => {
    const result = validateEnvironment({ PLATFORM_RELEASE: 'safe-label' });

    expect(result.PLATFORM_RELEASE).toBe('safe-label');
  });

  it.each([
    'postgres://user:pass@localhost:5432/reparared',
    'postgresql://user:pass@localhost:5432/reparared?sslmode=require',
  ])('accepts PostgreSQL URL %s', (databaseUrl) => {
    const result = validateEnvironment({ DATABASE_URL: databaseUrl });

    expect(result.DATABASE_URL).toBe(databaseUrl);
  });

  it.each(['mysql://user:pass@localhost:3306/reparared', 'not-a-database-url'])(
    'rejects non-PostgreSQL URL %s without exposing its value',
    (databaseUrl) => {
      const { error } = envSchema.validate({ DATABASE_URL: databaseUrl });

      expect(error?.message).toContain('DATABASE_URL');
      expect(error?.message).not.toContain(databaseUrl);
    },
  );

  it('allows DATABASE_URL to be absent for offline boot', () => {
    const result = validateEnvironment({});

    expect(result.DATABASE_URL).toBeUndefined();
  });

  it('accepts complete optional auth configuration without making it required at boot', () => {
    const result = validateEnvironment({
      AUTH_ISSUER_URL: 'https://auth.example.test',
      AUTH_JWKS_URL: 'https://auth.example.test/.well-known/jwks.json',
      AUTH_AUDIENCE: 'reparared-api',
    });

    expect(result).toMatchObject({
      AUTH_ISSUER_URL: 'https://auth.example.test',
      AUTH_JWKS_URL: 'https://auth.example.test/.well-known/jwks.json',
      AUTH_AUDIENCE: 'reparared-api',
    });
  });

  it('treats blank auth example assignments as absent for offline boot', () => {
    const result = validateEnvironment({
      AUTH_ISSUER_URL: '',
      AUTH_JWKS_URL: '',
      AUTH_AUDIENCE: '',
    });

    expect(result.AUTH_ISSUER_URL).toBeUndefined();
    expect(result.AUTH_JWKS_URL).toBeUndefined();
    expect(result.AUTH_AUDIENCE).toBeUndefined();
  });

  it.each([
    { AUTH_ISSUER_URL: 'ftp://auth.example.test' },
    { AUTH_JWKS_URL: 'ftp://auth.example.test' },
    { AUTH_AUDIENCE: 42 },
  ])('rejects malformed auth configuration safely', (input) => {
    const { error } = envSchema.validate(input);
    expect(error).toBeDefined();
    expect(error?.message).not.toContain(Object.values(input)[0]);
  });

  it.each(['0', '65536', 'not-a-port'])(
    'rejects invalid PORT %s safely',
    (port) => {
      const { error } = envSchema.validate({ PORT: port });

      expect(error).toBeDefined();
      expect(error?.message).not.toContain(port);
    },
  );

  it('reports all invalid consumed keys without printing values', () => {
    const { error } = envSchema.validate(
      {
        NODE_ENV: 'unknown-environment',
        PORT: 'invalid-port',
        LOG_LEVEL: 'verbose',
      },
      { abortEarly: false, allowUnknown: true, stripUnknown: false },
    );

    expect(error?.message).toContain('NODE_ENV');
    expect(error?.message).toContain('PORT');
    expect(error?.message).toContain('LOG_LEVEL');
    expect(error?.message).not.toContain('unknown-environment');
    expect(error?.message).not.toContain('invalid-port');
    expect(error?.message).not.toContain('verbose');
  });
});
