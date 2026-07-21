import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { MetricsService } from './metrics.service';

// NFR-OBS-01 — structured-enough request logging for MVP: one line per
// HTTP request with method/path/status/duration, via Nest's own Logger
// (already the convention used elsewhere, e.g. FallbackRoutingProvider)
// rather than pulling in a separate logging library.
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = Date.now();
    const path = request.originalUrl.split('?')[0];

    return next.handle().pipe(
      tap({
        next: () => this.record(request.method, path, response.statusCode, startedAt),
        error: () => this.record(request.method, path, response.statusCode || 500, startedAt),
      }),
    );
  }

  private record(method: string, path: string, status: number, startedAt: number): void {
    const durationMs = Date.now() - startedAt;
    this.logger.log(`${method} ${path} ${status} ${durationMs}ms`);
    this.metricsService.increment('http_requests_total', {
      method,
      status: String(status),
    });
  }
}
