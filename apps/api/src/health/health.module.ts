import { Module } from '@nestjs/common';
import { HealthIndicatorService, TerminusModule } from '@nestjs/terminus';
import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/app-config.service';
import { DatabaseModule } from '../database/database.module';
import {
  PrismaHealthIndicator,
  PRISMA_HEALTH_INDICATOR,
} from '../database/prisma-health.indicator';
import { PrismaService } from '../database/prisma.service';
import { FoundationIndicator } from './foundation.indicator';
import { HealthController } from './health.controller';

@Module({
  imports: [AppConfigModule, DatabaseModule, TerminusModule.forRoot()],
  controllers: [HealthController],
  providers: [
    FoundationIndicator,
    {
      provide: PRISMA_HEALTH_INDICATOR,
      inject: [AppConfigService, HealthIndicatorService, PrismaService],
      useFactory: (
        config: AppConfigService,
        healthIndicator: HealthIndicatorService,
        prisma: PrismaService,
      ): PrismaHealthIndicator | undefined =>
        config.databaseUrl
          ? new PrismaHealthIndicator(healthIndicator, prisma)
          : undefined,
    },
  ],
})
export class HealthModule {}
