import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { TrustedIdentity } from './jwt-verifier.port';

export type RequestWithIdentity = FastifyRequest & {
  trustedIdentity?: TrustedIdentity;
};

export const CurrentIdentity = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TrustedIdentity | undefined =>
    context.switchToHttp().getRequest<RequestWithIdentity>().trustedIdentity,
);
