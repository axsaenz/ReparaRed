import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { createPinoOptions } from './common/logging/pino-options';
import { AppConfigModule } from './config/config.module';
import { AppConfigService } from './config/app-config.service';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => createPinoOptions(config),
    }),
    DatabaseModule,
    HealthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
