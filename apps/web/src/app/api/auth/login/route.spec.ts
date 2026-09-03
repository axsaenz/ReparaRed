import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const cookies = new Map<string, string>([['reparared-csrf', 'csrf-token']]);
  return {
    cookies,
    provider: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      refreshSession: vi.fn(),
    },
    store: {
      get: (name: string) => {
        const value = cookies.get(name);
        return value ? { name, value } : undefined;
      },
      set: vi.fn((name: string, value: string) => cookies.set(name, value)),
      getAll: () =>
        [...cookies.entries()].map(([name, value]) => ({ name, value })),
    },
  };
});

vi.mock('../../../../lib/auth/cookies', () => ({
  getCookieStore: vi.fn(async () => mocks.store),
}));
vi.mock('../../../../lib/auth/supabase.provider', () => ({
  getAuthProvider: vi.fn(() => mocks.provider),
}));

import { POST } from './route';

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOWED_ORIGINS = 'https://app.example.test';
    mocks.cookies.set('reparared-csrf', 'csrf-token');
  });

  it('rejects origin and CSRF failures before provider interaction', async () => {
    const request = new Request('https://app.example.test/api/auth/login', {
      method: 'POST',
      headers: {
        origin: 'https://evil.example.test',
        'x-reparared-csrf': 'csrf-token',
      },
      body: JSON.stringify({
        email: 'user@example.test',
        password: 'password',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(mocks.provider.signInWithPassword).not.toHaveBeenCalled();
  });

  it('returns only sanitized state and preserves secure cookie writes', async () => {
    mocks.provider.signInWithPassword.mockResolvedValue({
      user: { email: 'User@Example.TEST' },
      accessToken: 'secret-access-token',
      expiresAt: Date.now() + 300_000,
    });
    const response = await POST(validRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      authenticated: true,
      email: 'user@example.test',
    });
    expect(await response.text().catch(() => '')).not.toContain(
      'secret-access-token',
    );
    expect(JSON.stringify(response)).not.toContain('secret-access-token');
    expect(mocks.provider.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.test',
      password: 'password',
    });
  });

  it('maps invalid credentials to a generic 401', async () => {
    mocks.provider.signInWithPassword.mockRejectedValue({
      detail: 'provider secret',
    });
    const response = await POST(validRequest());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('provider secret');
  });
});

function validRequest(): Request {
  return new Request('https://app.example.test/api/auth/login', {
    method: 'POST',
    headers: {
      origin: 'https://app.example.test',
      'x-reparared-csrf': 'csrf-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ email: 'user@example.test', password: 'password' }),
  });
}
