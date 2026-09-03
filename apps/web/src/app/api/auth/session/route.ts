import { ensureCsrfCookie, getCookieStore } from '../../../../lib/auth/cookies';
import { getAuthProvider } from '../../../../lib/auth/supabase.provider';
import { mapAuthError, safeEmail } from '../route-helpers';

export async function GET(): Promise<Response> {
  const store = await getCookieStore();
  ensureCsrfCookie(store);
  try {
    const provider = getAuthProvider(store);
    let session = await provider.getUser();
    if (
      session?.expiresAt !== undefined &&
      session.expiresAt <= Date.now() + 60_000
    ) {
      session = await provider.refreshSession();
    }
    const email = session ? safeEmail(session.user.email) : undefined;
    return Response.json(
      email ? { authenticated: true, email } : { authenticated: false },
    );
  } catch (error) {
    return mapAuthError(error);
  }
}
