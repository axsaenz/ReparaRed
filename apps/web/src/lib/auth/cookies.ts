import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

export const AUTH_COOKIE_BASE = 'reparared-auth';
export const CSRF_COOKIE = 'reparared-csrf';

export interface CookieValue {
  name: string;
  value: string;
}

export interface CookieOptions {
  name?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
  path?: string;
  maxAge?: number;
  expires?: Date;
}

export interface CookieStore {
  get(name: string): CookieValue | undefined;
  set(name: string, value: string, options?: CookieOptions): void;
  getAll?(): CookieValue[];
}

export async function getCookieStore(): Promise<CookieStore> {
  const store = await cookies();
  return {
    get: (name) => store.get(name),
    set: (name, value, options) => store.set(name, value, options),
    getAll: () => store.getAll(),
  };
}

export function isInsecureLocalCookiesAllowed(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return (
    environment.NODE_ENV !== 'production' &&
    environment.ALLOW_INSECURE_LOCAL_COOKIES === 'true'
  );
}

export function authCookieOptions(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): CookieOptions {
  return {
    name: AUTH_COOKIE_BASE,
    httpOnly: true,
    secure: !isInsecureLocalCookiesAllowed(environment),
    sameSite: 'lax',
    path: '/',
  };
}

export function csrfCookieOptions(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): CookieOptions {
  return {
    httpOnly: false,
    secure: !isInsecureLocalCookiesAllowed(environment),
    sameSite: 'lax',
    path: '/',
  };
}

export function clearAuthCookieChunks(store: CookieStore): void {
  const names = new Set<string>([AUTH_COOKIE_BASE]);
  for (const cookie of store.getAll?.() ?? []) {
    if (new RegExp(`^${AUTH_COOKIE_BASE}(?:\\.\\d+)?$`).test(cookie.name)) {
      names.add(cookie.name);
    }
  }

  const expired = { ...authCookieOptions(), maxAge: 0, expires: new Date(0) };
  for (const name of names) store.set(name, '', expired);
}

export function ensureCsrfCookie(store: CookieStore): string {
  const current = store.get(CSRF_COOKIE)?.value;
  if (current && /^[A-Za-z0-9_-]{43}$/.test(current)) return current;

  const value = randomBytes(32).toString('base64url');
  store.set(CSRF_COOKIE, value, csrfCookieOptions());
  return value;
}
