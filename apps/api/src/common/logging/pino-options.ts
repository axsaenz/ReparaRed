import { IncomingMessage, ServerResponse } from 'node:http';
import { Params } from 'nestjs-pino';
import { DestinationStream } from 'pino';
import { Options } from 'pino-http';
import { AppConfigService } from '../../config/app-config.service';
import { TRACE_ID_HEADER, resolveTraceId } from '../request/trace-id';

const SENSITIVE_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["set-cookie"]',
  'req.headers["x-api-key"]',
  'authorization',
  'cookie',
  'password',
  'passwordConfirmation',
  'passcode',
  'secret',
  'token',
  'accessToken',
  'refreshToken',
  'signedUrl',
  'signature',
  '*.password',
  '*.passwordConfirmation',
  '*.passcode',
  '*.secret',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.signedUrl',
  '*.signature',
];

type RequestLike = IncomingMessage & { id?: string | number };

export function createPinoOptions(
  config: AppConfigService,
  destination?: DestinationStream,
): Params<IncomingMessage, ServerResponse> {
  const pinoHttp: Options<IncomingMessage, ServerResponse> = {
    level: config.logLevel,
    base: {
      service: 'reparared-api',
      env: config.nodeEnv,
      environment: config.nodeEnv,
    },
    redact: SENSITIVE_PATHS,
    genReqId: (request) => resolveRequestId(request as RequestLike),
    customProps: (request) => ({
      traceId: resolveRequestId(request as RequestLike),
    }),
    serializers: {
      req: (request: RequestLike) => ({
        method: request.method,
        route: normalizeRoute(request.url),
      }),
      res: (response: ServerResponse) => ({
        statusCode: response.statusCode,
      }),
      body: () => undefined,
      query: () => undefined,
    },
    customSuccessObject: (request, response, value) => ({
      route: normalizeRoute(request.url),
      status: response.statusCode,
      duration: value.responseTime,
    }),
    customErrorObject: (request, response, _error, value) => ({
      route: normalizeRoute(request.url),
      status: response.statusCode,
      duration: value.responseTime,
    }),
    formatters: {
      level: (label) => ({ level: label }),
    },
  };

  if (destination) {
    pinoHttp.stream = destination;
  }

  return { pinoHttp };
}

export function normalizeRoute(url: string | undefined): string {
  if (!url) {
    return '/';
  }

  const queryStart = url.indexOf('?');
  return queryStart >= 0 ? url.slice(0, queryStart) : url;
}

function resolveRequestId(request: RequestLike): string {
  return resolveTraceId(request.id ?? request.headers[TRACE_ID_HEADER]);
}

export { SENSITIVE_PATHS };
