import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  provider: { getUser: vi.fn(), refreshSession: vi.fn() },
  store: {
    get: vi.fn(),
    set: vi.fn(),
    getAll: vi.fn(() => []),
  },
}));

vi.mock('../../../../lib/auth/cookies', async () => {
  const actual = await vi.importActual<
    typeof import('../../../../lib/auth/cookies')
  >('../../../../lib/auth/cookies');
  return { ...actual, getCookieStore: vi.fn(async () => mocks.store) };
});
vi.mock('../../../../lib/auth/supabase.provider', () => ({
  getAuthProvider: vi.fn(() => mocks.provider),
}));

import { GET } from './route';

describe('GET /api/auth/session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.store.get.mockReturnValue(undefined);
  });

  it('returns sanitized authenticated state and creates a readable CSRF cookie', async () => {
    mocks.provider.getUser.mockResolvedValue({
      user: { email: 'User@Example.TEST' },
      accessToken: 'never-return-this-token',
      expiresAt: Date.now() + 300_000,
    });
    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(JSON.parse(body)).toEqual({
      authenticated: true,
      email: 'user@example.test',
    });
    expect(body).not.toContain('never-return-this-token');
    expect(mocks.store.set).toHaveBeenCalledWith(
      'reparared-csrf',
      expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      expect.objectContaining({ httpOnly: false, sameSite: 'lax' }),
    );
  });

  it('refreshes a near-expiry session without exposing the access token', async () => {
    mocks.provider.getUser.mockResolvedValue({
      user: { email: 'user@example.test' },
      accessToken: 'old-token',
      expiresAt: Date.now() + 10_000,
    });
    mocks.provider.refreshSession.mockResolvedValue({
      user: { email: 'user@example.test' },
      accessToken: 'new-token',
      expiresAt: Date.now() + 300_000,
    });
    const response = await GET();
    expect(await response.json()).toEqual({
      authenticated: true,
      email: 'user@example.test',
    });
    expect(mocks.provider.refreshSession).toHaveBeenCalledOnce();
  });
});
