import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { getRequestTraceId } from '../request/trace-id';
import { createProblemDetails, normalizeFieldErrors } from './problem-details';

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<FastifyRequest>();
    const reply = context.getResponse<FastifyReply>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const response =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const fieldErrors = normalizeFieldErrors(response);
    const problem = createProblemDetails(
      status,
      getRequestTraceId(request),
      fieldErrors,
    );

    reply.status(problem.status).type('application/problem+json').send(problem);
  }
}
