import { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('constructs with the runtime URL without connecting', async () => {
    const connect = vi.spyOn(PrismaClient.prototype, '$connect');
    const disconnect = vi
      .spyOn(PrismaClient.prototype, '$disconnect')
      .mockResolvedValue();
    const config = { databaseUrl: 'postgresql://user:pass@localhost/db' };

    const prisma = new PrismaService(config as AppConfigService);

    expect(connect).not.toHaveBeenCalled();
    await prisma.onApplicationShutdown();
    expect(disconnect).toHaveBeenCalledTimes(1);

    connect.mockRestore();
    disconnect.mockRestore();
  });

  it('disconnects defensively and logs only a key-free message', async () => {
    const disconnect = vi
      .spyOn(PrismaClient.prototype, '$disconnect')
      .mockRejectedValue(new Error('postgresql://user:secret@db/reparared'));
    const prisma = new PrismaService({
      databaseUrl: undefined,
    } as AppConfigService);
    const warn = vi.spyOn(
      (prisma as unknown as { logger: { warn: (message: string) => void } })
        .logger,
      'warn',
    );

    await expect(prisma.onApplicationShutdown()).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledWith('Prisma client shutdown failed.');
    expect(warn.mock.calls.join(' ')).not.toContain('secret');

    disconnect.mockRestore();
    warn.mockRestore();
  });
});
