import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from './app.factory';

describe('API operational foundation', () => {
  let app: NestFastifyApplication;
  let server: FastifyInstance;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    server = app.getHttpAdapter().getInstance();
  });

  afterAll(async () => {
    await app.close();
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
