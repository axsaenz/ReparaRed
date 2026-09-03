import {
  clearAuthCookieChunks,
  getCookieStore,
} from '../../../../lib/auth/cookies';
import { validateMutation } from '../../../../lib/auth/csrf';
import { getAuthProvider } from '../../../../lib/auth/supabase.provider';
import { problem } from '../route-helpers';

export async function POST(request: Request): Promise<Response> {
  const store = await getCookieStore();
  if (!validateMutation(request, store)) return problem(403, 'FORBIDDEN');

  try {
    await getAuthProvider(store).signOut();
  } catch {
    // Local session deletion is unconditional and provider details stay private.
  } finally {
    clearAuthCookieChunks(store);
  }
  return Response.json({ authenticated: false });
}
