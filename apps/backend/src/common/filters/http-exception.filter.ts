import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

// docs/API_CONTRACT.md §8 — every response body uses { error_code, message }.
const DEFAULT_ERROR_CODE_BY_STATUS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_ERROR',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
};

interface ErrorBody {
  error_code: string;
  message: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json(this.toErrorBody(status, body, exception.message));
      return;
    }

    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ error_code: 'INTERNAL_ERROR', message: 'Internal server error' });
  }

  private toErrorBody(status: number, body: unknown, fallbackMessage: string): ErrorBody {
    if (this.isErrorBody(body)) {
      return body;
    }

    const message = this.extractMessage(body) ?? fallbackMessage;
    return {
      error_code: DEFAULT_ERROR_CODE_BY_STATUS[status] ?? 'INTERNAL_ERROR',
      message,
    };
  }

  private isErrorBody(body: unknown): body is ErrorBody {
    return (
      typeof body === 'object' &&
      body !== null &&
      typeof (body as Record<string, unknown>).error_code === 'string' &&
      typeof (body as Record<string, unknown>).message === 'string'
    );
  }

  private extractMessage(body: unknown): string | undefined {
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const message = (body as Record<string, unknown>).message;
      return Array.isArray(message) ? message.join('; ') : String(message);
    }
    return undefined;
  }
}
