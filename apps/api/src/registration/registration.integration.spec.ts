import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FastifyInstance } from 'fastify';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../app.factory';
import { PrismaService } from '../database/prisma.service';
import { TrustedIdentity } from './auth.port';

const districtId = '550e8400-e29b-41d4-a716-446655440000';
const profile = {
  name: 'Alex Smith',
  phone: '+51987654321',
  districtId,
};

type UserLookupArgs = {
  where: { authSubject?: string; email?: string };
};
type UserData = {
  authSubject: string;
  email: string;
  role: 'CLIENT' | 'TECHNICIAN';
  clientProfile: { create: typeof profile };
};
type UserCreateArgs = { data: UserData };
type UserUpdateArgs = { data: Pick<UserData, 'clientProfile'> };
type UserResult = {
  id: string;
  role: 'CLIENT' | 'TECHNICIAN';
  clientProfile: typeof profile | null;
};

describe('client onboarding HTTP endpoint', () => {
  let app: NestFastifyApplication;
  let server: FastifyInstance;
  let prisma: PrismaService;
  let identity: TrustedIdentity;
  let storedUser:
    | {
        id: string;
        authSubject: string;
        email: string;
        role: 'CLIENT' | 'TECHNICIAN';
        clientProfile: typeof profile | null;
      }
    | undefined;
  let emailOwner: { id: string; email: string } | undefined;
  let districtActive = true;

  beforeAll(async () => {
    identity = {
      authSubject: 'subject-1',
      email: '  Alex@Example.COM ',
      emailVerified: true,
    };
    app = await createApp({
      identityPort: { getVerifiedIdentity: async () => identity },
    });
    await app.init();
    server = app.getHttpAdapter().getInstance();
    prisma = app.get(PrismaService);

    const user = prisma.user as unknown as {
      findUnique: (
        args: UserLookupArgs,
      ) => Promise<UserResult | { id: string } | null>;
      create: (args: UserCreateArgs) => Promise<UserResult>;
      update: (args: UserUpdateArgs) => Promise<UserResult>;
    };
    user.findUnique = async ({ where }) => {
      const current = storedUser;
      const owner = emailOwner;
      if (where.authSubject) {
        return current
          ? {
              id: current.id,
              role: current.role,
              clientProfile: current.clientProfile,
            }
          : null;
      }
      if (where.email && current?.email === where.email) {
        return { id: current!.id };
      }
      if (where.email && owner?.email === where.email) {
        return { id: owner!.id };
      }
      return null;
    };
    user.create = async ({ data }) => {
      storedUser = {
        id: 'user-1',
        authSubject: data.authSubject,
        email: data.email,
        role: data.role,
        clientProfile: data.clientProfile.create,
      };
      return {
        id: storedUser.id,
        role: storedUser.role,
        clientProfile: storedUser.clientProfile,
      };
    };
    user.update = async ({ data }) => {
      if (!storedUser) throw new Error('missing user');
      storedUser.clientProfile = data.clientProfile.create;
      return {
        id: storedUser.id,
        role: storedUser.role,
        clientProfile: storedUser.clientProfile,
      };
    };
    prisma.$transaction = (async (callback: unknown) =>
      (callback as (tx: PrismaService) => Promise<unknown>)(
        prisma,
      )) as typeof prisma.$transaction;
    prisma.$queryRaw = (async () =>
      districtActive ? [{ id: districtId }] : []) as typeof prisma.$queryRaw;
  });

  beforeEach(() => {
    storedUser = undefined;
    emailOwner = undefined;
    districtActive = true;
    identity = {
      authSubject: 'subject-1',
      email: '  Alex@Example.COM ',
      emailVerified: true,
    };
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates the exact sanitized response and echoes the trace header', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/onboarding/client',
      headers: { 'x-trace-id': 'onboarding-trace' },
      payload: profile,
    });

    expect(response.statusCode).toBe(201);
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(response.headers['x-trace-id']).toBe('onboarding-trace');
    expect(response.json()).toEqual({ id: 'user-1', role: 'CLIENT', profile });
    expect(response.body).not.toMatch(/authSubject|password|token|provider/i);
  });

  it('reconciles a same-subject retry with 200 and no duplicate', async () => {
    const first = await server.inject({
      method: 'POST',
      url: '/api/v1/onboarding/client',
      payload: profile,
    });
    const second = await server.inject({
      method: 'POST',
      url: '/api/v1/onboarding/client',
      payload: profile,
    });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual({ id: 'user-1', role: 'CLIENT', profile });
  });

  it('returns generic 409 for another user with the same normalized email', async () => {
    emailOwner = { id: 'other-user', email: 'alex@example.com' };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/onboarding/client',
      payload: profile,
    });

    expect(response.statusCode).toBe(409);
    expect(response.headers['content-type']).toMatch(
      /^application\/problem\+json/,
    );
    expect(response.body).not.toMatch(/other-user|subject|database|provider/i);
  });

  it('returns 409 for an immutable role mismatch', async () => {
    storedUser = {
      id: 'technician-1',
      authSubject: 'subject-1',
      email: 'alex@example.com',
      role: 'TECHNICIAN',
      clientProfile: null,
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/onboarding/client',
      payload: profile,
    });

    expect(response.statusCode).toBe(409);
    expect(response.body).not.toMatch(/technician-1|subject/i);
  });

  it('returns 422 when district is missing or inactive in the transaction', async () => {
    districtActive = false;
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/onboarding/client',
      payload: profile,
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({
      code: 'SEMANTIC_INVALID',
      fieldErrors: {
        districtId: ['districtId must reference an active district.'],
      },
    });
    expect(storedUser).toBeUndefined();
  });

  it('returns 401 for an unverified identity', async () => {
    identity.emailVerified = false;
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/onboarding/client',
      payload: profile,
    });

    expect(response.statusCode).toBe(401);
    expect(response.body).not.toMatch(/authSubject|password|token|provider/i);
    expect(storedUser).toBeUndefined();
  });

  it('returns 400 for malformed or body-supplied identity data', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/onboarding/client',
      payload: {
        ...profile,
        email: 'attacker@example.com',
        authSubject: 'attacker',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).not.toMatch(/attacker|authSubject|password|token/i);
    expect(storedUser).toBeUndefined();
  });

  it('returns safe 500 for an unexpected persistence failure', async () => {
    const originalTransaction = prisma.$transaction;
    prisma.$transaction = (async () => {
      throw new Error('persistence provider internals');
    }) as typeof prisma.$transaction;

    try {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/onboarding/client',
        payload: profile,
      });
      expect(response.statusCode).toBe(500);
      expect(response.body).not.toMatch(/persistence|provider|internals/i);
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });
});
