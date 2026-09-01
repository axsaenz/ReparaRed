import { FastifyServerOptions } from 'fastify';
import { resolveTraceId, traceIdFromHeaders } from './trace-id';

export const fastifyRequestOptions: Pick<FastifyServerOptions, 'genReqId'> = {
  genReqId: (request) => traceIdFromHeaders(request),
};

export { resolveTraceId };
