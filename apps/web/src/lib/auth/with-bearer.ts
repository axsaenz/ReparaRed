import { createApiClient, type ApiClientOptions } from '@repara/api-client';
import type { AuthProvider } from './auth-provider.port';
import { AuthenticationRequiredError } from './auth-provider.port';

export async function withBearer(
  provider: AuthProvider,
  options: ApiClientOptions,
): Promise<ReturnType<typeof createApiClient>> {
  let session = await provider.getUser();
  if (
    session?.expiresAt !== undefined &&
    session.expiresAt <= Date.now() + 60_000
  ) {
    session = await provider.refreshSession();
  }
  if (!session?.accessToken) throw new AuthenticationRequiredError();

  return createApiClient({
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${session.accessToken}`,
    },
  });
}
