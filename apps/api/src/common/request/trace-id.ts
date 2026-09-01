import { randomUUID } from 'node:crypto';
import { FastifyInstance, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    traceId: string;
  }
}

export const TRACE_ID_HEADER = 'x-trace-id';
export const TRACE_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

export type TraceIdInput = string | string[] | undefined;

export function isValidTraceId(value: unknown): value is string {
  return typeof value === 'string' && TRACE_ID_PATTERN.test(value);
}

export function resolveTraceId(value: unknown): string {
  return isValidTraceId(value) ? value : randomUUID();
}

export function getRequestTraceId(request: FastifyRequest): string {
  return resolveTraceId(request.traceId ?? request.id);
}

export function registerTraceIdHooks(fastify: FastifyInstance): void {
  if (!fastify.hasRequestDecorator('traceId')) {
    fastify.decorateRequest('traceId', '');
  }

  fastify.addHook('onRequest', (request, _reply, done) => {
    request.traceId = request.id;
    done();
  });

  fastify.addHook('onSend', (request, reply, payload, done) => {
    reply.header(TRACE_ID_HEADER, getRequestTraceId(request));
    done(null, payload);
  });
}

export function traceIdFromHeaders(request: {
  headers: Record<string, string | string[] | undefined>;
}): string {
  return resolveTraceId(request.headers[TRACE_ID_HEADER]);
}
