import {
  Controller,
  Get,
  Inject,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HealthCheckService, HealthIndicatorFunction } from '@nestjs/terminus';
import {
  PrismaHealthIndicator,
  PRISMA_HEALTH_INDICATOR,
} from '../database/prisma-health.indicator';
import { FoundationIndicator } from './foundation.indicator';

interface MinimalHealthResponse {
  status: 'ok';
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly healthCheck: HealthCheckService,
    private readonly foundation: FoundationIndicator,
    @Optional()
    @Inject(PRISMA_HEALTH_INDICATOR)
    private readonly database?: PrismaHealthIndicator,
  ) {}

  @Get('live')
  async live(): Promise<MinimalHealthResponse> {
    await this.healthCheck.check([]);
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(): Promise<MinimalHealthResponse> {
    try {
      const indicators: HealthIndicatorFunction[] = [
        () => this.foundation.isHealthy(),
      ];
      const database = this.database;

      if (database) {
        indicators.push(() => database.isHealthy('database'));
      }

      const result = await this.healthCheck.check(indicators);

      if (result.status !== 'ok') {
        throw new ServiceUnavailableException();
      }

      return { status: 'ok' };
    } catch {
      // Terminus failures, including HealthCheckError-compatible errors, stay safe.
      throw new ServiceUnavailableException();
    }
  }
}
