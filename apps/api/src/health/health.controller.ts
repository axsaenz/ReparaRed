import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthCheckService } from '@nestjs/terminus';
import { FoundationIndicator } from './foundation.indicator';

interface MinimalHealthResponse {
  status: 'ok';
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly healthCheck: HealthCheckService,
    private readonly foundation: FoundationIndicator,
  ) {}

  @Get('live')
  async live(): Promise<MinimalHealthResponse> {
    await this.healthCheck.check([]);
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(): Promise<MinimalHealthResponse> {
    try {
      const result = await this.healthCheck.check([
        () => this.foundation.isHealthy(),
        // Ordered extension point #4: add the database indicator here.
      ]);

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
