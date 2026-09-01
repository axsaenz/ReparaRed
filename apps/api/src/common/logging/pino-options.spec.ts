import { IncomingMessage, ServerResponse } from 'node:http';
import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { AppConfigService } from '../../config/app-config.service';
import { createPinoOptions, SENSITIVE_PATHS } from './pino-options';

describe('pino options', () => {
  it('sets the operational fields and aligned request ID generator', () => {
    const options = createPinoOptions(config()).pinoHttp;
    if (!options || 'write' in options || Array.isArray(options)) {
      throw new Error('Expected pino-http options');
    }

    expect(options.level).toBe('debug');
    expect(options.base).toMatchObject({
      service: 'reparared-api',
      env: 'test',
      environment: 'test',
    });
    expect(
      options.genReqId?.(
        {
          headers: { 'x-trace-id': 'same-trace' },
        } as unknown as IncomingMessage,
        {} as ServerResponse,
      ),
    ).toBe('same-trace');
    expect(SENSITIVE_PATHS).toEqual(
      expect.arrayContaining([
        'req.headers.authorization',
        'req.headers.cookie',
        '*.password',
        '*.token',
        '*.signedUrl',
      ]),
    );
  });

  it('writes one-line JSON with required fields and without body/query data', () => {
    const lines: string[] = [];
    const destination = { write: (line: string) => lines.push(line) };
    const options = createPinoOptions(config(), destination).pinoHttp;
    if (!options || 'write' in options || Array.isArray(options)) {
      throw new Error('Expected pino-http options');
    }

    const rawTraceId = 'unsafe\ntrace';
    const generatedTraceId = options.genReqId?.(
      {
        headers: { 'x-trace-id': rawTraceId },
      } as unknown as IncomingMessage,
      {} as ServerResponse,
    );
    const logger = pino(options, destination);
    logger.info(
      {
        traceId: generatedTraceId,
        req: {
          method: 'GET',
          url: '/api/v1/example?password=url-password',
          headers: {
            authorization: 'Bearer should-not-appear',
            cookie: 'session=cookie-secret',
            'x-trace-id': rawTraceId,
          },
        },
        route: '/api/v1/example',
        status: 200,
        duration: 4,
        authorization: 'Bearer should-not-appear',
        password: 'secret-password',
        body: { password: 'body-password' },
        query: { signedUrl: 'signed-url-secret' },
      },
      'request completed',
    );

    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toContain('\n\n');
    const record = JSON.parse(lines[0]);
    expect(record).toMatchObject({
      level: 'info',
      service: 'reparared-api',
      env: 'test',
      environment: 'test',
      traceId: generatedTraceId,
      route: '/api/v1/example',
      status: 200,
      duration: 4,
    });
    expect(record.time).toBeTypeOf('number');
    expect(record).not.toHaveProperty('body');
    expect(record).not.toHaveProperty('query');
    expect(JSON.stringify(record)).not.toContain('should-not-appear');
    expect(JSON.stringify(record)).not.toContain('secret-password');
    expect(JSON.stringify(record)).not.toContain('signed-url-secret');
    expect(JSON.stringify(record)).not.toContain(rawTraceId);
    expect(JSON.stringify(record)).not.toContain('url-password');
    expect(JSON.stringify(record)).not.toContain('cookie-secret');
  });
});

function config(): AppConfigService {
  return {
    logLevel: 'debug',
    nodeEnv: 'test',
  } as AppConfigService;
}
