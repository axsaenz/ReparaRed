import { ServiceUnavailableException } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { describe, expect, it, vi } from 'vitest';
import { PrismaHealthIndicator } from './prisma-health.indicator';
import { PrismaService } from './prisma.service';

describe('PrismaHealthIndicator', () => {
  it('reports an up database after a successful SELECT 1', async () => {
    const up = vi.fn().mockReturnValue({ database: { status: 'up' } });
    const queryRaw = vi.fn().mockResolvedValue([{ '?column?': 1 }]);
    const indicator = new PrismaHealthIndicator(
      {
        check: vi.fn().mockReturnValue({ up }),
      } as unknown as HealthIndicatorService,
      { $queryRaw: queryRaw } as unknown as PrismaService,
    );

    await expect(indicator.isHealthy('database')).resolves.toEqual({
      database: { status: 'up' },
    });
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(up).toHaveBeenCalledTimes(1);
  });

  it('converts a rejected query into a safe 503 exception', async () => {
    const queryRaw = vi
      .fn()
      .mockRejectedValue(new Error('postgresql://user:secret@db/reparared'));
    const indicator = new PrismaHealthIndicator(
      {} as HealthIndicatorService,
      { $queryRaw: queryRaw } as unknown as PrismaService,
    );

    await expect(indicator.isHealthy('database')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(indicator.isHealthy('database')).rejects.not.toHaveProperty(
      'message',
      expect.stringContaining('secret'),
    );
  });
});
