import { getCookieStore } from '../../../../lib/auth/cookies';
import { validateMutation } from '../../../../lib/auth/csrf';
import { getAuthProvider } from '../../../../lib/auth/supabase.provider';
import {
  mapAuthError,
  problem,
  readCredentials,
  safeEmail,
} from '../route-helpers';

export async function POST(request: Request): Promise<Response> {
  const store = await getCookieStore();
  if (!validateMutation(request, store)) return problem(403, 'FORBIDDEN');

  try {
    const credentials = await readCredentials(request);
    const session =
      await getAuthProvider(store).signInWithPassword(credentials);
    const email = safeEmail(session.user.email);
    if (!email) return problem(503, 'DEPENDENCY_UNAVAILABLE');
    return Response.json({ authenticated: true, email });
  } catch (error) {
    return mapAuthError(error);
  }
}
