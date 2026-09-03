import { DynamicModule, Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import {
  IDENTITY_PORT,
  IdentityPort,
  UnavailableIdentityPort,
} from './auth.port';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';
import { AuthModule } from '../auth/auth.module';

@Module({})
export class RegistrationModule {
  static register(identityPort?: IdentityPort): DynamicModule {
    const resolvedIdentityPort = identityPort ?? new UnavailableIdentityPort();
    return {
      module: RegistrationModule,
      imports: [DatabaseModule, AuthModule.register(identityPort)],
      controllers: [RegistrationController],
      providers: [
        RegistrationService,
        { provide: IDENTITY_PORT, useValue: resolvedIdentityPort },
      ],
      exports: [RegistrationService],
    };
  }
}
