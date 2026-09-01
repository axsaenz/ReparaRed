import {
  BadRequestException,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../database/prisma.service';
import { CatalogsService } from './catalogs.service';

function createService(): {
  service: CatalogsService;
  categoryFindMany: ReturnType<typeof vi.fn>;
  districtFindMany: ReturnType<typeof vi.fn>;
} {
  const categoryFindMany = vi.fn();
  const districtFindMany = vi.fn();
  const prisma = {
    category: { findMany: categoryFindMany },
    district: { findMany: districtFindMany },
  } as unknown as PrismaService;

  return {
    service: new CatalogsService(prisma),
    categoryFindMany,
    districtFindMany,
  };
}

describe('CatalogsService', () => {
  it('reads active categories with the exact projection and stable ordering', async () => {
    const { service, categoryFindMany } = createService();
    categoryFindMany.mockResolvedValue([
      { id: 'category-2', slug: 'zeta', name: 'Zeta' },
      { id: 'category-1', slug: 'alpha', name: 'Alpha' },
    ]);

    await expect(service.listCategories()).resolves.toEqual([
      { id: 'category-2', slug: 'zeta', name: 'Zeta' },
      { id: 'category-1', slug: 'alpha', name: 'Alpha' },
    ]);
    expect(categoryFindMany).toHaveBeenCalledWith({
      where: { active: true },
      select: { id: true, slug: true, name: true },
      orderBy: [{ slug: 'asc' }, { id: 'asc' }],
    });
  });

  it('reads active districts and maps the persistence UBIGEO field', async () => {
    const { service, districtFindMany } = createService();
    districtFindMany.mockResolvedValue([
      {
        id: 'district-1',
        ubigeo: '070101',
        name: 'Callao',
        province: 'Callao',
        department: 'Callao',
      },
    ]);

    await expect(service.listDistricts('true')).resolves.toEqual([
      {
        id: 'district-1',
        ubigeoCode: '070101',
        name: 'Callao',
        province: 'Callao',
        department: 'Callao',
      },
    ]);
    expect(districtFindMany).toHaveBeenCalledWith({
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
  });

  it('returns empty arrays without changing the successful read contract', async () => {
    const { service, categoryFindMany, districtFindMany } = createService();
    categoryFindMany.mockResolvedValue([]);
    districtFindMany.mockResolvedValue([]);

    await expect(service.listCategories()).resolves.toEqual([]);
    await expect(service.listDistricts()).resolves.toEqual([]);
  });

  it('accepts omitted and true active values but rejects false semantically', async () => {
    const { service, categoryFindMany } = createService();
    categoryFindMany.mockResolvedValue([]);

    await expect(service.listCategories()).resolves.toEqual([]);
    await expect(service.listCategories('true')).resolves.toEqual([]);
    await expect(service.listCategories('false')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(categoryFindMany).toHaveBeenCalledTimes(2);
  });

  it.each(['TRUE', '', '1', 'no'])(
    'rejects malformed active value %s as input invalid',
    async (active) => {
      const { service, districtFindMany } = createService();

      await expect(service.listDistricts(active)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(districtFindMany).not.toHaveBeenCalled();
    },
  );

  it('translates Prisma connection failures into a sanitized 503', async () => {
    const { service, categoryFindMany } = createService();
    const failure = Object.assign(
      new Error('connection internals SQL failure'),
      { code: 'P1001' },
    );
    categoryFindMany.mockRejectedValue(failure);

    const error = await service.listCategories().catch((caught) => caught);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(
      JSON.stringify((error as ServiceUnavailableException).getResponse()),
    ).not.toContain('internals');
    expect(
      JSON.stringify((error as ServiceUnavailableException).getResponse()),
    ).not.toContain('database');
  });

  it('translates unexpected failures into a sanitized 500', async () => {
    const { service, districtFindMany } = createService();
    districtFindMany.mockRejectedValue(
      new Error('internal SQL implementation detail'),
    );

    const error = await service.listDistricts().catch((caught) => caught);

    expect(error).toBeInstanceOf(InternalServerErrorException);
    expect(
      JSON.stringify((error as InternalServerErrorException).getResponse()),
    ).not.toContain('implementation');
  });
});
