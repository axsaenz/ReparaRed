import { DynamicModule, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { createPinoOptions } from './common/logging/pino-options';
import { AppConfigModule } from './config/config.module';
import { AppConfigService } from './config/app-config.service';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { CatalogsModule } from './catalogs/catalogs.module';
import { IdentityPort } from './registration/auth.port';
import { RegistrationModule } from './registration/registration.module';

@Module({
  controllers: [AppController],
})
export class AppModule {
  static register(identityPort?: IdentityPort): DynamicModule {
    return {
      module: AppModule,
      imports: [
        AppConfigModule,
        LoggerModule.forRootAsync({
          imports: [AppConfigModule],
          inject: [AppConfigService],
          useFactory: (config: AppConfigService) => createPinoOptions(config),
        }),
        DatabaseModule,
        HealthModule,
        CatalogsModule,
        RegistrationModule.register(identityPort),
      ],
      controllers: [AppController],
    };
  }
}
