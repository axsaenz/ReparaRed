import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Environment, LogLevel, NodeEnvironment } from './env.schema';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<Environment, true>) {}

  get nodeEnv(): NodeEnvironment {
    return this.config.get<string>('NODE_ENV', {
      infer: true,
    }) as NodeEnvironment;
  }

  get port(): number {
    return this.config.get<number>('PORT', { infer: true });
  }

  get host(): string {
    return this.config.get<string>('HOST', { infer: true });
  }

  get logLevel(): LogLevel {
    return this.config.get<string>('LOG_LEVEL', { infer: true }) as LogLevel;
  }

  get databaseUrl(): string | undefined {
    return this.config.get<string>('DATABASE_URL', { infer: true });
  }

  get authIssuerUrl(): string | undefined {
    return this.config.get<string | undefined>('AUTH_ISSUER_URL', {
      infer: true,
    });
  }

  get authJwksUrl(): string | undefined {
    return this.config.get<string | undefined>('AUTH_JWKS_URL', {
      infer: true,
    });
  }

  get authAudience(): string | undefined {
    return this.config.get<string | undefined>('AUTH_AUDIENCE', {
      infer: true,
    });
  }
}
