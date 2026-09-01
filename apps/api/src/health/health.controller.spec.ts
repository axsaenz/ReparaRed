import { ServiceUnavailableException } from '@nestjs/common';
import { HealthCheckService } from '@nestjs/terminus';
import { describe, expect, it, vi } from 'vitest';
import { FoundationIndicator } from './foundation.indicator';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from '../database/prisma-health.indicator';

describe('HealthController', () => {
  it('checks no dependencies for liveness and returns minimal JSON', async () => {
    const check = vi.fn().mockResolvedValue({ status: 'ok', details: {} });
    const controller = new HealthController(
      { check } as unknown as HealthCheckService,
      {} as FoundationIndicator,
    );

    await expect(controller.live()).resolves.toEqual({ status: 'ok' });
    expect(check).toHaveBeenCalledWith([]);
  });

  it('checks only the foundation indicator for readiness', async () => {
    const check = vi.fn().mockResolvedValue({ status: 'ok', details: {} });
    const foundation = {
      isHealthy: vi.fn().mockReturnValue({
        'app-foundation': { status: 'up' },
      }),
    } as unknown as FoundationIndicator;
    const controller = new HealthController(
      { check } as unknown as HealthCheckService,
      foundation,
    );

    await expect(controller.ready()).resolves.toEqual({ status: 'ok' });
    expect(check).toHaveBeenCalledTimes(1);
    const indicators = check.mock.calls[0][0] as Array<() => unknown>;
    expect(indicators).toHaveLength(1);
    expect(indicators[0]()).toEqual({ 'app-foundation': { status: 'up' } });
  });

  it('adds the configured database indicator at extension point #4', async () => {
    const check = vi.fn().mockResolvedValue({ status: 'ok', details: {} });
    const foundation = {} as FoundationIndicator;
    const database = {
      isHealthy: vi.fn().mockResolvedValue({ database: { status: 'up' } }),
    } as unknown as PrismaHealthIndicator;
    const controller = new HealthController(
      { check } as unknown as HealthCheckService,
      foundation,
      database,
    );

    await expect(controller.ready()).resolves.toEqual({ status: 'ok' });

    const indicators = check.mock.calls[0][0] as Array<() => unknown>;
    expect(indicators).toHaveLength(2);
    await expect(indicators[1]()).resolves.toEqual({
      database: { status: 'up' },
    });
    expect(database.isHealthy).toHaveBeenCalledWith('database');
  });

  it('turns a Terminus failure into a safe 503 exception', async () => {
    const check = vi.fn().mockRejectedValue(new Error('dependency secret'));
    const controller = new HealthController(
      { check } as unknown as HealthCheckService,
      {} as FoundationIndicator,
    );

    await expect(controller.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('turns a down foundation result into a 503 exception', async () => {
    const check = vi.fn().mockResolvedValue({
      status: 'error',
      details: { 'app-foundation': { status: 'down' } },
    });
    const controller = new HealthController(
      { check } as unknown as HealthCheckService,
      {} as FoundationIndicator,
    );

    await expect(controller.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
