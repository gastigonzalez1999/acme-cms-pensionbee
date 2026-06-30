/**
 * Global exception filter.
 *
 * Catches all unhandled exceptions and turns them into a consistent JSON
 * shape.  Critically, it never leaks stack traces or internal error messages
 * in production — anything that isn't an HttpException becomes a generic
 * "Internal server error" response.
 *
 * Non-HttpExceptions (real 500s) are logged before masking so errors are
 * visible in the Render logs even though they don't surface to callers.
 */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    // Log unexpected errors so they're traceable in production (Render logs,
    // structured pino output) without leaking details to the caller.
    if (!(exception instanceof HttpException)) {
      this.logger.error(exception, 'Unhandled exception');
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
