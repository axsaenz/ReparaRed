import { DynamicModule, Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import {
  IDENTITY_PORT,
  IdentityPort,
  UnavailableIdentityPort,
} from './auth.port';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';

@Module({})
export class RegistrationModule {
  static register(
    identityPort: IdentityPort = new UnavailableIdentityPort(),
  ): DynamicModule {
    return {
      module: RegistrationModule,
      imports: [DatabaseModule],
      controllers: [RegistrationController],
      providers: [
        RegistrationService,
        { provide: IDENTITY_PORT, useValue: identityPort },
      ],
      exports: [RegistrationService],
    };
  }
}
