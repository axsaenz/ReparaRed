import {
  Controller,
  Get,
  Inject,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthCheckService, HealthIndicatorFunction } from '@nestjs/terminus';
import { ProblemDetailsDto } from '../common/dto/problem-details.dto';
import { SystemStatusDto } from '../common/dto/system-status.dto';
import {
  PrismaHealthIndicator,
  PRISMA_HEALTH_INDICATOR,
} from '../database/prisma-health.indicator';
import { FoundationIndicator } from './foundation.indicator';

@ApiTags('system')
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
  @ApiOperation({
    summary: 'Liveness probe',
    description: 'Unversioned system path: GET /health/live',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is live',
    type: SystemStatusDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable',
    type: ProblemDetailsDto,
  })
  async live(): Promise<SystemStatusDto> {
    await this.healthCheck.check([]);
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe',
    description: 'Unversioned system path: GET /health/ready',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is ready',
    type: SystemStatusDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Service not ready',
    type: ProblemDetailsDto,
  })
  async ready(): Promise<SystemStatusDto> {
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
