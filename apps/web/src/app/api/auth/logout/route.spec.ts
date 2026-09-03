import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const cookies = new Map<string, string>([
    ['reparared-csrf', 'csrf-token'],
    ['reparared-auth', 'chunk-0'],
    ['reparared-auth.1', 'chunk-1'],
  ]);
  return {
    cookies,
    provider: { signOut: vi.fn() },
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

vi.mock('../../../../lib/auth/cookies', async () => {
  const actual = await vi.importActual<
    typeof import('../../../../lib/auth/cookies')
  >('../../../../lib/auth/cookies');
  return { ...actual, getCookieStore: vi.fn(async () => mocks.store) };
});
vi.mock('../../../../lib/auth/supabase.provider', () => ({
  getAuthProvider: vi.fn(() => mocks.provider),
}));

import { POST } from './route';

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOWED_ORIGINS = 'https://app.example.test';
    mocks.cookies.set('reparared-csrf', 'csrf-token');
    mocks.cookies.set('reparared-auth', 'chunk-0');
    mocks.cookies.set('reparared-auth.1', 'chunk-1');
  });

  it('clears every local auth chunk when provider sign-out fails', async () => {
    mocks.provider.signOut.mockRejectedValue(
      new Error('provider internals secret'),
    );
    const response = await POST(validRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authenticated: false });
    expect(mocks.store.set).toHaveBeenCalledWith(
      'reparared-auth',
      '',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', maxAge: 0 }),
    );
    expect(mocks.store.set).toHaveBeenCalledWith(
      'reparared-auth.1',
      '',
      expect.objectContaining({ httpOnly: true, secure: true }),
    );
  });

  it('rejects a missing CSRF header without signing out', async () => {
    const request = new Request('https://app.example.test/api/auth/logout', {
      method: 'POST',
      headers: { origin: 'https://app.example.test' },
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(mocks.provider.signOut).not.toHaveBeenCalled();
  });
});

function validRequest(): Request {
  return new Request('https://app.example.test/api/auth/logout', {
    method: 'POST',
    headers: {
      origin: 'https://app.example.test',
      'x-reparared-csrf': 'csrf-token',
    },
  });
}
