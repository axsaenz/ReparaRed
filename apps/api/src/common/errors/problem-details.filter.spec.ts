import { ArgumentsHost, HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ProblemDetailsFilter } from './problem-details.filter';
import { createProblemDetails, normalizeFieldErrors } from './problem-details';

const statusCodes = [
  [400, 'INPUT_INVALID'],
  [401, 'AUTHENTICATION_REQUIRED'],
  [403, 'FORBIDDEN'],
  [404, 'NOT_FOUND'],
  [409, 'CONFLICT'],
  [422, 'SEMANTIC_INVALID'],
  [429, 'RATE_LIMITED'],
  [503, 'DEPENDENCY_UNAVAILABLE'],
] as const;

describe('ProblemDetailsFilter', () => {
  it.each(statusCodes)('maps HTTP %s to %s', (status, code) => {
    const { filter, reply } = createFilterHarness();

    filter.catch(
      new HttpException('ignored message', status),
      createHost(reply),
    );

    expect(reply.status).toHaveBeenCalledWith(status);
    expect(reply.type).toHaveBeenCalledWith('application/problem+json');
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        status,
        code,
        type: `urn:reparared:error:${code}`,
        detail: expect.not.stringContaining('ignored message'),
        traceId: 'trace-for-test',
      }),
    );
  });

  it('maps an unexpected exception to a safe 500 problem', () => {
    const { filter, reply } = createFilterHarness();
    const unsafe = new Error('database password token and SQL details');
    unsafe.stack = 'stack with secret-token';

    filter.catch(unsafe, createHost(reply));

    expect(reply.send).toHaveBeenCalledWith({
      ...createProblemDetails(500, 'trace-for-test'),
    });
    expect(JSON.stringify(reply.send.mock.calls[0][0])).not.toContain(
      'database',
    );
    expect(JSON.stringify(reply.send.mock.calls[0][0])).not.toContain(
      'secret-token',
    );
  });

  it('normalizes field errors into sorted, stable arrays', () => {
    expect(
      normalizeFieldErrors({
        fieldErrors: {
          zip: ['must be numeric', 'must be numeric'],
          email: 'must be valid',
        },
      }),
    ).toEqual({
      email: ['must be valid'],
      zip: ['must be numeric'],
    });
  });

  it('includes normalized field errors without using arbitrary exception text', () => {
    const { filter, reply } = createFilterHarness();

    filter.catch(
      new HttpException(
        {
          fieldErrors: {
            password: ['must be stronger'],
            email: ['must be valid'],
          },
        },
        400,
      ),
      createHost(reply),
    );

    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: 'The request input is invalid.',
        fieldErrors: {
          email: ['must be valid'],
          password: ['must be stronger'],
        },
      }),
    );
  });
});

function createFilterHarness() {
  const reply = {
    send: vi.fn(),
    status: vi.fn().mockReturnThis(),
    type: vi.fn().mockReturnThis(),
  };

  return { filter: new ProblemDetailsFilter(), reply };
}

function createHost(
  reply: ReturnType<typeof createFilterHarness>['reply'],
): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ id: 'trace-for-test', traceId: 'trace-for-test' }),
      getResponse: () => reply,
    }),
  } as unknown as ArgumentsHost;
}
