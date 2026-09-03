import {
  BadRequestException,
  ConflictException,
  Inject,
  HttpException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { IDENTITY_PORT, IdentityPort, TrustedIdentity } from './auth.port';
import { ClientOnboardingResponseDto } from './dto/client-onboarding.response.dto';
import { OnboardClientRequestDto } from './dto/onboard-client.request.dto';

const userProjectionSelect = {
  id: true,
  role: true,
  clientProfile: {
    select: { name: true, phone: true, districtId: true },
  },
} as const;

type UserProjection = {
  id: string;
  role: 'CLIENT' | 'TECHNICIAN';
  clientProfile: {
    name: string;
    phone: string;
    districtId: string;
  } | null;
};

@Injectable()
export class RegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IDENTITY_PORT) private readonly identityPort: IdentityPort,
  ) {}

  async onboard(
    raw: unknown,
    principal?: TrustedIdentity,
  ): Promise<{
    status: 200 | 201;
    body: ClientOnboardingResponseDto;
  }> {
    const input = parseOnboardRequest(raw);
    const identity = principal
      ? this.validateIdentity(principal)
      : await this.readIdentity();
    const email = normalizeEmail(identity.email);
    const bySubject = await this.prisma.user.findUnique({
      where: { authSubject: identity.authSubject },
      select: userProjectionSelect,
    });

    assertClientOrUnclaimed(bySubject);
    if (bySubject?.clientProfile) {
      return { status: 200, body: project(bySubject) };
    }

    if (!bySubject) {
      const byEmail = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (byEmail) throw new ConflictException();
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const current = await tx.user.findUnique({
          where: { authSubject: identity.authSubject },
          select: userProjectionSelect,
        });
        assertClientOrUnclaimed(current);
        if (current?.clientProfile) {
          return { status: 200 as const, row: current };
        }

        if (!current) {
          const duplicate = await tx.user.findUnique({
            where: { email },
            select: { id: true },
          });
          if (duplicate) throw new ConflictException();
        }

        const district = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM districts WHERE id = ${input.districtId}
            AND active = true FOR SHARE`;
        if (district.length === 0) {
          throw new UnprocessableEntityException({
            fieldErrors: {
              districtId: ['districtId must reference an active district.'],
            },
          });
        }

        if (current) {
          return {
            status: 200 as const,
            row: await tx.user.update({
              where: { id: current.id },
              data: { clientProfile: { create: input } },
              select: userProjectionSelect,
            }),
          };
        }

        return {
          status: 201 as const,
          row: await tx.user.create({
            data: {
              authSubject: identity.authSubject,
              email,
              role: 'CLIENT',
              clientProfile: { create: input },
            },
            select: userProjectionSelect,
          }),
        };
      });

      return { status: result.status, body: project(result.row) };
    } catch (error) {
      if (isEmailP2002(error)) throw new ConflictException();
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException();
    }
  }

  private async readIdentity(): Promise<TrustedIdentity> {
    let identity: TrustedIdentity;
    try {
      identity = await this.identityPort.getVerifiedIdentity();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new UnauthorizedException();
    }

    return this.validateIdentity(identity);
  }

  private validateIdentity(identity: TrustedIdentity): TrustedIdentity {
    if (
      !identity ||
      typeof identity.authSubject !== 'string' ||
      identity.authSubject.length === 0 ||
      /[\u0000-\u001f\u007f]/.test(identity.authSubject) ||
      typeof identity.email !== 'string' ||
      identity.email.length === 0 ||
      identity.emailVerified !== true ||
      /[\u0000-\u001f\u007f]/.test(identity.email)
    ) {
      throw new UnauthorizedException();
    }

    return identity;
  }
}

export function parseOnboardRequest(raw: unknown): OnboardClientRequestDto {
  if (!isRecord(raw)) throw new BadRequestException();

  const keys = Object.keys(raw).sort();
  if (keys.join(',') !== 'districtId,name,phone') {
    throw new BadRequestException();
  }

  const name = raw.name;
  const phone = raw.phone;
  const districtId = raw.districtId;
  if (
    typeof name !== 'string' ||
    [...name].length < 2 ||
    [...name].length > 100 ||
    typeof phone !== 'string' ||
    !/^\+[1-9]\d{7,14}$/.test(phone) ||
    typeof districtId !== 'string' ||
    !isUuid(districtId)
  ) {
    throw new BadRequestException();
  }

  return { name, phone, districtId };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function project(row: UserProjection): ClientOnboardingResponseDto {
  if (!row.clientProfile) throw new InternalServerErrorException();
  return {
    id: row.id,
    role: 'CLIENT',
    profile: {
      name: row.clientProfile.name,
      phone: row.clientProfile.phone,
      districtId: row.clientProfile.districtId,
    },
  };
}

function assertClientOrUnclaimed(row: UserProjection | null): void {
  if (row && row.role !== 'CLIENT') throw new ConflictException();
}

function isEmailP2002(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    if (!isRecord(error) || error.code !== 'P2002') return false;
  } else if (error.code !== 'P2002') {
    return false;
  }

  const meta = isRecord(error) && isRecord(error.meta) ? error.meta : undefined;
  const target = meta?.target;
  return Array.isArray(target) && target.some((entry) => entry === 'email');
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
