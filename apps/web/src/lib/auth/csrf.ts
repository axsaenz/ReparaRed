import { timingSafeEqual } from 'node:crypto';
import type { CookieStore } from './cookies';

export function allowedOrigins(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Set<string> {
  return new Set(
    (environment.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

export function validateMutation(
  request: Request,
  store: CookieStore,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  const origin = request.headers.get('origin') ?? originFromReferer(request);
  const allowed = allowedOrigins(environment);
  if (!origin || !allowed.has(origin)) return false;

  const expected = store.get('reparared-csrf')?.value;
  const supplied = request.headers.get('x-reparared-csrf');
  return (
    expected !== undefined &&
    supplied !== null &&
    constantTimeEqual(expected, supplied)
  );
}

function originFromReferer(request: Request): string | undefined {
  const referer = request.headers.get('referer');
  if (!referer) return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}
