import {
  CanActivate,
  Inject,
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import type { RequestWithIdentity } from './auth.decorator';
import {
  AuthConfigurationUnavailableError,
  AuthDependencyUnavailableError,
  JWT_VERIFIER,
  type JwtVerifier,
} from './jwt-verifier.port';
import { strictBearer } from './jwks.verifier';
import {
  IDENTITY_PORT,
  type IdentityPort,
  UnavailableIdentityPort,
} from '../registration/auth.port';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    @Inject(JWT_VERIFIER) private readonly verifier: JwtVerifier,
    @Optional()
    @Inject(IDENTITY_PORT)
    private readonly offlineIdentity?: IdentityPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithIdentity>();
    if (
      this.offlineIdentity &&
      !(this.offlineIdentity instanceof UnavailableIdentityPort)
    ) {
      try {
        request.trustedIdentity =
          await this.offlineIdentity.getVerifiedIdentity();
        return true;
      } catch {
        throw new UnauthorizedException();
      }
    }

    const bearer = strictBearer(request.headers.authorization);
    if (!bearer) throw new UnauthorizedException();

    try {
      request.trustedIdentity = await this.verifier.verify(bearer);
      return true;
    } catch (error) {
      if (error instanceof AuthDependencyUnavailableError) {
        throw new ServiceUnavailableException();
      }
      if (error instanceof AuthConfigurationUnavailableError) {
        this.logger.warn(
          'Authentication is unavailable because server configuration is incomplete.',
        );
      }
      throw new UnauthorizedException();
    }
  }
}

@Injectable()
export class OfflineAuthGuard implements CanActivate {
  constructor(
    @Inject(IDENTITY_PORT) private readonly identityPort: IdentityPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithIdentity>();
    try {
      request.trustedIdentity = await this.identityPort.getVerifiedIdentity();
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
