import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { FastifyInstance } from 'fastify';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../app.factory';
import { PrismaService } from '../database/prisma.service';

describe('catalog HTTP endpoints', () => {
  let app: NestFastifyApplication;
  let server: FastifyInstance;
  let categoryFindMany: ReturnType<typeof vi.fn>;
  let districtFindMany: ReturnType<typeof vi.fn>;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeAll(async () => {
    delete process.env.DATABASE_URL;
    app = await createApp();
    await app.init();
    server = app.getHttpAdapter().getInstance();

    const prisma = app.get(PrismaService);
    categoryFindMany = vi.spyOn(
      prisma.category,
      'findMany',
    ) as unknown as ReturnType<typeof vi.fn>;
    districtFindMany = vi.spyOn(
      prisma.district,
      'findMany',
    ) as unknown as ReturnType<typeof vi.fn>;
  });

  beforeEach(() => {
    categoryFindMany.mockReset();
    districtFindMany.mockReset();
    categoryFindMany.mockResolvedValue([]);
    districtFindMany.mockResolvedValue([]);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await app.close();
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  it('returns the exact category envelope and echoes a valid trace header', async () => {
    categoryFindMany.mockResolvedValue([
      {
        id: 'category-1',
        slug: 'electricidad-basica',
        name: 'Electricidad básica',
      },
    ]);

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/categories',
      headers: { 'x-trace-id': 'catalog-trace' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(response.headers['x-trace-id']).toBe('catalog-trace');
    expect(response.json()).toEqual({
      data: [
        {
          id: 'category-1',
          slug: 'electricidad-basica',
          name: 'Electricidad básica',
        },
      ],
    });
    expect(categoryFindMany).toHaveBeenCalledWith({
      where: { active: true },
      select: { id: true, slug: true, name: true },
      orderBy: [{ slug: 'asc' }, { id: 'asc' }],
    });
  });

  it('returns the district envelope with database order and no persistence fields', async () => {
    districtFindMany.mockResolvedValue([
      {
        id: 'district-2',
        ubigeo: '150101',
        name: 'Lima',
        province: 'Lima',
        department: 'Lima',
      },
      {
        id: 'district-1',
        ubigeo: '070101',
        name: 'Callao',
        province: 'Callao',
        department: 'Callao',
      },
    ]);

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/districts?active=true',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: [
        {
          id: 'district-2',
          ubigeoCode: '150101',
          name: 'Lima',
          province: 'Lima',
          department: 'Lima',
        },
        {
          id: 'district-1',
          ubigeoCode: '070101',
          name: 'Callao',
          province: 'Callao',
          department: 'Callao',
        },
      ],
    });
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

  it('returns 200 with empty data for empty active catalogs', async () => {
    const categories = await server.inject({
      method: 'GET',
      url: '/api/v1/categories',
    });
    const districts = await server.inject({
      method: 'GET',
      url: '/api/v1/districts',
    });

    expect(categories.statusCode).toBe(200);
    expect(categories.json()).toEqual({ data: [] });
    expect(districts.statusCode).toBe(200);
    expect(districts.json()).toEqual({ data: [] });
  });

  it.each([
    ['/api/v1/categories?active=false', 'categories'],
    ['/api/v1/districts?active=false', 'districts'],
  ])('rejects public inactive query for %s with semantic 422', async (url) => {
    const response = await server.inject({ method: 'GET', url });

    expect(response.statusCode).toBe(422);
    expect(response.headers['content-type']).toMatch(
      /^application\/problem\+json/,
    );
    expect(response.json()).toMatchObject({
      status: 422,
      code: 'SEMANTIC_INVALID',
    });
  });

  it.each(['/api/v1/categories?active=TRUE', '/api/v1/districts?active=1'])(
    'rejects malformed active query %s with input 400',
    async (url) => {
      const response = await server.inject({ method: 'GET', url });

      expect(response.statusCode).toBe(400);
      expect(response.headers['content-type']).toMatch(
        /^application\/problem\+json/,
      );
      expect(response.json()).toMatchObject({
        status: 400,
        code: 'INPUT_INVALID',
      });
    },
  );

  it('translates a persistence failure into sanitized problem JSON 503', async () => {
    categoryFindMany.mockRejectedValue(
      Object.assign(new Error('connection internals SQL detail'), {
        code: 'P1001',
      }),
    );

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/categories',
    });

    expect(response.statusCode).toBe(503);
    expect(response.headers['content-type']).toMatch(
      /^application\/problem\+json/,
    );
    expect(response.body).not.toContain('connection');
    expect(response.body).not.toContain('internals');
    expect(response.json()).toMatchObject({
      status: 503,
      code: 'DEPENDENCY_UNAVAILABLE',
    });
  });

  it('keeps wrong catalog paths as 404 problem responses', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/catalogs/categories',
    });

    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type']).toMatch(
      /^application\/problem\+json/,
    );
    expect(response.json()).toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});
