import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { RequestMethod } from '@nestjs/common';
import { ProblemDetailsFilter } from './common/errors/problem-details.filter';
import { fastifyRequestOptions } from './common/request/fastify-hooks';
import { registerTraceIdHooks } from './common/request/trace-id';
import { AppModule } from './app.module';

export async function createAppForExport(): Promise<NestFastifyApplication> {
  // Export uses the same metadata-bearing module graph without listening.
  return createApp();
}

export async function createApp(): Promise<NestFastifyApplication> {
  const adapter = new FastifyAdapter(fastifyRequestOptions);
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    { abortOnError: false, logger: false },
  );

  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: '/', method: RequestMethod.GET },
      { path: '/health/live', method: RequestMethod.GET },
      { path: '/health/ready', method: RequestMethod.GET },
    ],
  });
  app.useGlobalFilters(new ProblemDetailsFilter());
  registerTraceIdHooks(app.getHttpAdapter().getInstance());

  return app;
}
