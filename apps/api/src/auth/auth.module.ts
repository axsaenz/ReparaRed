import { DynamicModule, Module } from '@nestjs/common';
import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/app-config.service';
import {
  IDENTITY_PORT,
  type IdentityPort,
  UnavailableIdentityPort,
} from '../registration/auth.port';
import { AuthGuard, OfflineAuthGuard } from './auth.guard';
import { JWT_VERIFIER, UnavailableJwtVerifier } from './jwt-verifier.port';
import { JwksVerifier } from './jwks.verifier';

@Module({})
export class AuthModule {
  static register(identityPort?: IdentityPort): DynamicModule {
    const offline = identityPort !== undefined;
    return {
      module: AuthModule,
      imports: [AppConfigModule],
      providers: [
        {
          provide: IDENTITY_PORT,
          useValue: identityPort ?? new UnavailableIdentityPort(),
        },
        {
          provide: JWT_VERIFIER,
          inject: [AppConfigService],
          useFactory: (config: AppConfigService) => {
            if (
              !config.authIssuerUrl ||
              !config.authJwksUrl ||
              !config.authAudience
            ) {
              return new UnavailableJwtVerifier();
            }
            return new JwksVerifier(
              config.authIssuerUrl,
              config.authJwksUrl,
              config.authAudience,
            );
          },
        },
        OfflineAuthGuard,
        offline
          ? { provide: AuthGuard, useClass: OfflineAuthGuard }
          : AuthGuard,
      ],
      exports: [AuthGuard, JWT_VERIFIER],
    };
  }
}
