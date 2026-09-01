import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { FoundationIndicator } from './foundation.indicator';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule.forRoot()],
  controllers: [HealthController],
  providers: [FoundationIndicator],
})
export class HealthModule {}
