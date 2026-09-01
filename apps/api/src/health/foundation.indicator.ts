import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';

@Injectable()
export class FoundationIndicator {
  constructor(private readonly healthIndicator: HealthIndicatorService) {}

  isHealthy(): HealthIndicatorResult<'app-foundation', 'up'> {
    return this.healthIndicator.check('app-foundation').up();
  }
}
