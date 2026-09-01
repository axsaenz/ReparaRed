import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { PrismaService } from './prisma.service';

const DATABASE_QUERY_TIMEOUT_MS = 2000;
export const PRISMA_HEALTH_INDICATOR = Symbol('PRISMA_HEALTH_INDICATOR');

@Injectable()
export class PrismaHealthIndicator {
  constructor(
    private readonly healthIndicator: HealthIndicatorService,
    private readonly prisma: PrismaService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult<string, 'up'>> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error('Database health check timed out.')),
            DATABASE_QUERY_TIMEOUT_MS,
          );
        }),
      ]);

      return this.healthIndicator.check(key).up();
    } catch {
      throw new ServiceUnavailableException();
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }
}
