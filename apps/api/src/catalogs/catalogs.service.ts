import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface CategoryResponse {
  id: string;
  slug: string;
  name: string;
}

export interface DistrictResponse {
  id: string;
  ubigeoCode: string;
  name: string;
  province: string;
  department: string;
}

@Injectable()
export class CatalogsService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories(active?: unknown): Promise<CategoryResponse[]> {
    validateActiveQuery(active);

    try {
      const rows = await this.prisma.category.findMany({
        where: { active: true },
        select: { id: true, slug: true, name: true },
        orderBy: [{ slug: 'asc' }, { id: 'asc' }],
      });

      return rows.map(({ id, slug, name }) => ({ id, slug, name }));
    } catch (error) {
      throw catalogReadException(error);
    }
  }

  async listDistricts(active?: unknown): Promise<DistrictResponse[]> {
    validateActiveQuery(active);

    try {
      const rows = await this.prisma.district.findMany({
        where: { active: true },
        select: {
          id: true,
          ubigeo: true,
          name: true,
          province: true,
          department: true,
        },
        orderBy: [{ ubigeo: 'asc' }, { id: 'asc' }],
      });

      return rows.map(({ id, ubigeo, name, province, department }) => ({
        id,
        ubigeoCode: ubigeo,
        name,
        province,
        department,
      }));
    } catch (error) {
      throw catalogReadException(error);
    }
  }
}

function validateActiveQuery(active: unknown): void {
  if (active === undefined || active === 'true') {
    return;
  }

  if (active === 'false') {
    throw new UnprocessableEntityException();
  }

  throw new BadRequestException();
}

function catalogReadException(error: unknown): Error {
  if (isDependencyError(error)) {
    return new ServiceUnavailableException();
  }

  return new InternalServerErrorException();
}

function isDependencyError(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
  ) {
    return true;
  }

  if (!isRecord(error)) {
    return false;
  }

  const code = error.code;
  if (typeof code === 'string' && /^P\d{4}$/.test(code)) {
    return true;
  }

  return (
    error.name === 'PrismaClientInitializationError' ||
    error.name === 'PrismaClientKnownRequestError' ||
    error.name === 'PrismaClientRustPanicError' ||
    error.name === 'PrismaClientUnknownRequestError'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
