import {
  AuthInputError,
  AuthProviderError,
} from '../../../lib/auth/auth-provider.port';

export function problem(status: number, code: string): Response {
  return Response.json({ code }, { status });
}

export function mapAuthError(error: unknown): Response {
  if (error instanceof AuthInputError)
    return problem(401, 'AUTHENTICATION_REQUIRED');
  if (
    error instanceof AuthProviderError &&
    error.kind === 'invalid-credentials'
  ) {
    return problem(401, 'AUTHENTICATION_REQUIRED');
  }
  return problem(503, 'DEPENDENCY_UNAVAILABLE');
}

export async function readCredentials(
  request: Request,
): Promise<{ email: string; password: string }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AuthInputError();
  }
  if (
    !isRecord(body) ||
    typeof body.email !== 'string' ||
    typeof body.password !== 'string'
  ) {
    throw new AuthInputError();
  }
  const keys = Object.keys(body).sort();
  if (
    keys.join(',') !== 'email,password' ||
    body.email.length === 0 ||
    body.password.length === 0
  ) {
    throw new AuthInputError();
  }
  if (/[\u0000-\u001f\u007f]/.test(body.email)) throw new AuthInputError();
  return { email: body.email, password: body.password };
}

export function safeEmail(email: string): string | undefined {
  const normalized = email.trim().toLowerCase();
  return normalized && !/[\u0000-\u001f\u007f]/.test(normalized)
    ? normalized
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
