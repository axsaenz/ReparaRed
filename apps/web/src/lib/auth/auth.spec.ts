import { describe, expect, it, vi } from 'vitest';
import { clearAuthCookieChunks, type CookieStore } from './cookies';
import { validateMutation } from './csrf';
import { withBearer } from './with-bearer';

describe('BFF auth boundaries', () => {
  it('uses constant-time CSRF equality and exact allowed origins', () => {
    const store = memoryStore({ 'reparared-csrf': 'csrf-token' });
    const valid = new Request('https://app.example.test/mutation', {
      headers: {
        origin: 'https://app.example.test',
        'x-reparared-csrf': 'csrf-token',
      },
    });
    const invalid = new Request('https://app.example.test/mutation', {
      headers: {
        origin: 'https://evil.example.test',
        'x-reparared-csrf': 'csrf-token',
      },
    });
    expect(
      validateMutation(valid, store, {
        ALLOWED_ORIGINS: 'https://app.example.test',
      }),
    ).toBe(true);
    expect(
      validateMutation(invalid, store, {
        ALLOWED_ORIGINS: 'https://app.example.test',
      }),
    ).toBe(false);
  });

  it('expires every discovered auth chunk with server-only cookie flags', () => {
    const store = memoryStore({
      'reparared-auth': 'a',
      'reparared-auth.2': 'b',
    });
    clearAuthCookieChunks(store);
    expect(store.set).toHaveBeenCalledWith(
      'reparared-auth.2',
      '',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 0,
      }),
    );
  });

  it('forwards only a current or refreshed server session as Authorization', async () => {
    const provider = {
      getUser: vi.fn().mockResolvedValue({
        user: { email: 'user@example.test' },
        accessToken: 'short-lived-token',
        expiresAt: Date.now() + 10_000,
      }),
      refreshSession: vi.fn().mockResolvedValue({
        user: { email: 'user@example.test' },
        accessToken: 'refreshed-token',
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    };
    const fetchImpl = vi.fn<typeof fetch>(async (input, init) => {
      expect(new Request(input, init).headers.get('authorization')).toBe(
        'Bearer refreshed-token',
      );
      return new Response(JSON.stringify({}), {
        headers: { 'content-type': 'application/json' },
      });
    });
    const client = await withBearer(provider, {
      baseUrl: 'https://api.example.test',
      fetch: fetchImpl,
    });
    await client.GET('/api/v1/categories');
    expect(provider.refreshSession).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});

function memoryStore(
  values: Record<string, string>,
): CookieStore & { set: ReturnType<typeof vi.fn> } {
  const entries = new Map(Object.entries(values));
  return {
    get: (name) => {
      const value = entries.get(name);
      return value ? { name, value } : undefined;
    },
    set: vi.fn((name: string, value: string) => entries.set(name, value)),
    getAll: () =>
      [...entries.entries()].map(([name, value]) => ({ name, value })),
  };
}
