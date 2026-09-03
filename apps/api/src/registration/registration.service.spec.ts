import {
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../database/prisma.service';
import { FakeIdentityPort } from './auth.port';
import { RegistrationService } from './registration.service';

const districtId = '550e8400-e29b-41d4-a716-446655440000';
const input = {
  name: 'Alex Smith',
  phone: '+51987654321',
  districtId,
};

type Harness = ReturnType<typeof createHarness>;

function clientRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    role: 'CLIENT' as const,
    clientProfile: {
      name: input.name,
      phone: input.phone,
      districtId,
    },
    ...overrides,
  };
}

function createHarness() {
  const userFindUnique = vi.fn();
  const userCreate = vi.fn();
  const userUpdate = vi.fn();
  const txUserFindUnique = vi.fn();
  const txUserCreate = vi.fn();
  const txUserUpdate = vi.fn();
  const queryRaw = vi.fn();
  const tx = {
    user: {
      findUnique: txUserFindUnique,
      create: txUserCreate,
      update: txUserUpdate,
    },
    $queryRaw: queryRaw,
  };
  const transaction = vi.fn(async (callback: (value: typeof tx) => unknown) =>
    callback(tx),
  );
  const prisma = {
    user: {
      findUnique: userFindUnique,
      create: userCreate,
      update: userUpdate,
    },
    $transaction: transaction,
  } as unknown as PrismaService;
  const identity = new FakeIdentityPort({
    authSubject: 'subject-1',
    email: '  Alex@Example.COM  ',
    emailVerified: true,
  });

  return {
    service: new RegistrationService(prisma, identity),
    identity,
    userFindUnique,
    userCreate,
    userUpdate,
    txUserFindUnique,
    txUserCreate,
    txUserUpdate,
    queryRaw,
    transaction,
  };
}

function configureFirstCreate(harness: Harness): void {
  harness.userFindUnique
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(null);
  harness.txUserFindUnique
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(null);
  harness.queryRaw.mockResolvedValue([{ id: districtId }]);
  harness.txUserCreate.mockResolvedValue(clientRow());
}

describe('RegistrationService', () => {
  it('normalizes trusted email and creates a client in exactly one transaction', async () => {
    const harness = createHarness();
    configureFirstCreate(harness);

    await expect(harness.service.onboard(input)).resolves.toEqual({
      status: 201,
      body: {
        id: 'user-1',
        role: 'CLIENT',
        profile: input,
      },
    });

    expect(harness.transaction).toHaveBeenCalledTimes(1);
    expect(harness.txUserCreate).toHaveBeenCalledWith({
      data: {
        authSubject: 'subject-1',
        email: 'alex@example.com',
        role: 'CLIENT',
        clientProfile: { create: input },
      },
      select: expect.any(Object),
    });
    expect(harness.queryRaw).toHaveBeenCalledTimes(1);
    const [template, parameter] = harness.queryRaw.mock.calls[0];
    expect(template.join('')).not.toContain(districtId);
    expect(parameter).toBe(districtId);
  });

  it('does not apply provider-specific dot or plus rewriting', async () => {
    const harness = createHarness();
    harness.identity = new FakeIdentityPort({
      authSubject: 'subject-1',
      email: ' User.Name+tag@Example.COM ',
      emailVerified: true,
    });
    const service = new RegistrationService(
      (harness.service as unknown as { prisma: PrismaService }).prisma,
      harness.identity,
    );
    configureFirstCreate({ ...harness, service } as Harness);

    await service.onboard(input);
    expect(harness.txUserCreate.mock.calls[0][0].data.email).toBe(
      'user.name+tag@example.com',
    );
  });

  it('returns a complete same-subject client without starting a transaction', async () => {
    const harness = createHarness();
    harness.userFindUnique.mockResolvedValue(clientRow());

    await expect(harness.service.onboard(input)).resolves.toMatchObject({
      status: 200,
      body: {
        id: 'user-1',
        role: 'CLIENT',
        profile: input,
      },
    });
    expect(harness.transaction).not.toHaveBeenCalled();
  });

  it('rejects an immutable non-client role before writing', async () => {
    const harness = createHarness();
    harness.userFindUnique.mockResolvedValue({
      id: 'technician-1',
      role: 'TECHNICIAN',
      clientProfile: null,
    });

    await expect(harness.service.onboard(input)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(harness.transaction).not.toHaveBeenCalled();
  });

  it('rejects a different user that already owns normalized email', async () => {
    const harness = createHarness();
    harness.userFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'other-user' });

    await expect(harness.service.onboard(input)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(harness.transaction).not.toHaveBeenCalled();
  });

  it('revalidates the active district inside the transaction', async () => {
    const harness = createHarness();
    configureFirstCreate(harness);
    harness.queryRaw.mockResolvedValue([]);

    const error = await harness.service
      .onboard(input)
      .catch((caught) => caught);
    expect(error).toBeInstanceOf(UnprocessableEntityException);
    expect((error as UnprocessableEntityException).getResponse()).toEqual({
      fieldErrors: {
        districtId: ['districtId must reference an active district.'],
      },
    });
    expect(harness.txUserCreate).not.toHaveBeenCalled();
  });

  it('maps email uniqueness races to the same generic conflict', async () => {
    const harness = createHarness();
    configureFirstCreate(harness);
    harness.txUserCreate.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['email'] },
      message: 'database and provider internals',
    });

    const error = await harness.service
      .onboard(input)
      .catch((caught) => caught);
    expect(error).toBeInstanceOf(ConflictException);
    expect(
      JSON.stringify((error as ConflictException).getResponse()),
    ).not.toContain('internals');
  });

  it('rolls back through the transaction boundary on profile persistence failure', async () => {
    const harness = createHarness();
    configureFirstCreate(harness);
    harness.txUserCreate.mockRejectedValue(new Error('profile write failed'));

    await expect(harness.service.onboard(input)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
    expect(harness.transaction).toHaveBeenCalledTimes(1);
  });

  it('completes a client user that has no profile with 200 semantics', async () => {
    const harness = createHarness();
    harness.userFindUnique.mockResolvedValue({
      id: 'user-1',
      role: 'CLIENT',
      clientProfile: null,
    });
    harness.txUserFindUnique.mockResolvedValue({
      id: 'user-1',
      role: 'CLIENT',
      clientProfile: null,
    });
    harness.queryRaw.mockResolvedValue([{ id: districtId }]);
    harness.txUserUpdate.mockResolvedValue(clientRow());

    await expect(harness.service.onboard(input)).resolves.toMatchObject({
      status: 200,
      body: {
        id: 'user-1',
        role: 'CLIENT',
        profile: input,
      },
    });
    expect(harness.txUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { clientProfile: { create: input } } }),
    );
  });

  it('fails closed for unverified identity before persistence', async () => {
    const harness = createHarness();
    const service = new RegistrationService(
      (harness.service as unknown as { prisma: PrismaService }).prisma,
      new FakeIdentityPort({
        authSubject: 'subject-1',
        email: 'person@example.com',
        emailVerified: false,
      }),
    );

    await expect(service.onboard(input)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(harness.userFindUnique).not.toHaveBeenCalled();
  });

  it('rejects control-character identity email without logging or persistence', async () => {
    const harness = createHarness();
    const service = new RegistrationService(
      (harness.service as unknown as { prisma: PrismaService }).prisma,
      new FakeIdentityPort({
        authSubject: 'subject-1',
        email: 'person@example.com\nforged-entry',
        emailVerified: true,
      }),
    );

    await expect(service.onboard(input)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(harness.userFindUnique).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'A', phone: input.phone, districtId },
    { name: input.name, phone: '51987654321', districtId },
    { name: input.name, phone: input.phone, districtId: 'not-a-uuid' },
  ])(
    'rejects malformed profile input without persistence: %o',
    async (body) => {
      const harness = createHarness();
      await expect(harness.service.onboard(body)).rejects.toThrow();
      expect(harness.userFindUnique).not.toHaveBeenCalled();
    },
  );

  it('never adds persistence secrets to the allowlisted projection', async () => {
    const harness = createHarness();
    configureFirstCreate(harness);
    harness.txUserCreate.mockResolvedValue({
      ...clientRow(),
      authSubject: 'hidden-subject',
      password: 'hidden-value',
      token: 'hidden-token',
    });

    const result = await harness.service.onboard(input);
    expect(JSON.stringify(result.body)).not.toMatch(
      /authSubject|password|token/i,
    );
  });
});
