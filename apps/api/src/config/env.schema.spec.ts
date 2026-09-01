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
