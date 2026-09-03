import 'server-only';
import { createServerClient } from '@supabase/ssr';
import type { CookieStore } from './cookies';
import { authCookieOptions } from './cookies';
import {
  AuthProviderError,
  type AuthProvider,
  type AuthSession,
} from './auth-provider.port';

const OPERATION_TIMEOUT_MS = 5_000;

export function getAuthProvider(store: CookieStore): AuthProvider {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new AuthProviderError('dependency');
  }

  const client = createServerClient(url, anonKey, {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll: () => store.getAll?.() ?? [],
      setAll: (updates) => {
        for (const update of updates) {
          store.set(update.name, update.value, {
            ...authCookieOptions(),
            ...update.options,
            httpOnly: true,
          });
        }
      },
    },
  });

  return {
    signInWithPassword: async ({ email, password }) => {
      const result = await bounded(() =>
        client.auth.signInWithPassword({ email, password }),
      );
      if (result.error || !result.data.session || !result.data.user?.email) {
        throw new AuthProviderError(
          result.error?.status === 400 ? 'invalid-credentials' : 'dependency',
        );
      }
      return toSession(result.data.session, result.data.user.email);
    },
    signOut: async () => {
      const result = await bounded(() => client.auth.signOut());
      if (result.error) throw new AuthProviderError('dependency');
    },
    getUser: async () => {
      const result = await bounded(() => client.auth.getUser());
      if (result.error || !result.data.user) return null;
      const session = await bounded(() => client.auth.getSession());
      return session.data.session
        ? toSession(session.data.session, result.data.user.email ?? '')
        : null;
    },
    refreshSession: async () => {
      const result = await bounded(() => client.auth.refreshSession());
      if (result.error || !result.data.session || !result.data.user?.email)
        return null;
      return toSession(result.data.session, result.data.user.email);
    },
  };
}

function toSession(
  session: {
    access_token: string;
    expires_at?: number;
    user: { email?: string };
  },
  email: string,
): AuthSession {
  return {
    user: { email },
    accessToken: session.access_token,
    expiresAt: session.expires_at ? session.expires_at * 1_000 : undefined,
  };
}

async function bounded<T>(operation: () => Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        timeout = setTimeout(
          () => reject(new AuthProviderError('dependency')),
          OPERATION_TIMEOUT_MS,
        );
      }),
    ]);
  } catch (error) {
    if (error instanceof AuthProviderError) throw error;
    throw new AuthProviderError('dependency');
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
