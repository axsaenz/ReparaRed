import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FastifyInstance } from 'fastify';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from './app.factory';
import { PrismaService } from './database/prisma.service';

describe('API operational foundation', () => {
  let app: NestFastifyApplication;
  let server: FastifyInstance;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeAll(async () => {
    delete process.env.DATABASE_URL;
    app = await createApp();
    await app.init();
    server = app.getHttpAdapter().getInstance();
  });

  afterAll(async () => {
    await app.close();
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  it('serves the unversioned root smoke route', async () => {
    const response = await server.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    expect(response.headers['x-trace-id']).toBeTypeOf('string');
  });

  it.each(['/health/live', '/health/ready'])(
    'serves minimal unversioned health route %s',
    async (url) => {
      const response = await server.inject({ method: 'GET', url });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ok' });
      expect(response.headers['x-trace-id']).toBeTypeOf('string');
    },
  );

  it('returns safe 503 readiness for a configured unreachable database', async () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://user:secret@unreachable/reparared';
    let configuredApp: NestFastifyApplication | undefined;

    try {
      configuredApp = await createApp();
      const prisma = configuredApp.get(PrismaService);
      vi.spyOn(prisma, '$queryRaw').mockRejectedValue(
        new Error('network failure for configured database'),
      );
      vi.spyOn(prisma, '$disconnect').mockResolvedValue();
      await configuredApp.init();

      const response = await configuredApp
        .getHttpAdapter()
        .getInstance()
        .inject({ method: 'GET', url: '/health/ready' });

      expect(response.statusCode).toBe(503);
      expect(response.headers['content-type']).toMatch(
        /^application\/problem\+json/,
      );
      expect(response.body).not.toContain('secret');
      expect(response.body).not.toContain('unreachable');
    } finally {
      await configuredApp?.close();
      if (previousDatabaseUrl === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previousDatabaseUrl;
      }
    }
  });

  it('keeps Prisma npm scripts free of URL and credential literals', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(__dirname, '../package.json'), 'utf8'),
    ) as { scripts?: Record<string, string> };
    const scripts = packageJson.scripts ?? {};

    expect(scripts).toMatchObject({
      'prisma:generate': 'prisma generate',
      'prisma:migrate:deploy': 'prisma migrate deploy',
      'prisma:migrate:status': 'prisma migrate status',
    });
    expect(Object.values(scripts).join('\n')).not.toMatch(
      /(postgres(?:ql)?:\/\/|password|secret|@)/i,
    );
  });

  it('correlates unknown route problem body and response header', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/not-a-real-route?password=should-not-log',
      headers: { 'x-trace-id': 'integration-trace' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type']).toMatch(
      /^application\/problem\+json/,
    );
    expect(response.headers['x-trace-id']).toBe('integration-trace');
    expect(response.json()).toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      traceId: 'integration-trace',
    });
    expect(response.json().detail).not.toContain('password');
  });

  it.each(['x'.repeat(129), 'unsafe\ntrace', 'unsafe\u0000trace'])(
    'replaces malformed trace input %s with a generated ID',
    async (traceId) => {
      const response = await server.inject({
        method: 'GET',
        url: '/health/live',
        headers: { 'x-trace-id': traceId },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-trace-id']).toBeTypeOf('string');
      expect(response.headers['x-trace-id']).not.toBe(traceId);
    },
  );

  it('starts and injects without opening a listening socket or using dependencies', () => {
    expect(server.server.listening).toBe(false);
  });
});
