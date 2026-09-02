import { afterEach, describe, expect, it, vi } from 'vitest';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createAppForExport } from '../app.factory';
import { PrismaService } from '../database/prisma.service';

describe('OpenAPI export boundary', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
    vi.restoreAllMocks();
  });

  it('creates a valid document without connecting to a database or listening', async () => {
    delete process.env.DATABASE_URL;
    const connect = vi.spyOn(PrismaService.prototype, '$connect');
    let app: NestFastifyApplication | undefined;

    try {
      app = await createAppForExport();
      await app.init();
      const document = SwaggerModule.createDocument(
        app,
        new DocumentBuilder()
          .setTitle('ReparaRed API')
          .setVersion('1.0.0')
          .build(),
      );
      const server = app.getHttpAdapter().getInstance();

      expect(Object.keys(document.paths)).toEqual(
        expect.arrayContaining([
          '/',
          '/api/v1/categories',
          '/api/v1/districts',
          '/health/live',
          '/health/ready',
        ]),
      );
      expect(connect).not.toHaveBeenCalled();
      expect(server.server.listening).toBe(false);
    } finally {
      await app?.close();
    }
  });
});
