import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { firstValueFrom, of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';
import { MetricsService } from './metrics.service';

// R6-4 (docs/roadmap/SPRINT_R6_SECURITY_HARDENING.md). Global interceptor
// (NFR-OBS-01) with real branching — never tested. Coverage confirmed the
// gap: src/observability sits at 46% even with metrics.service.spec.ts
// fully passing, because this file contributes nothing.

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let metricsService: { increment: jest.Mock };

  beforeEach(() => {
    metricsService = { increment: jest.fn() };
    interceptor = new LoggingInterceptor(metricsService as unknown as MetricsService);
  });

  function buildHttpContext(statusCode: number | undefined): ExecutionContext {
    const response = { statusCode };
    const request = { method: 'GET', originalUrl: '/api/vehicles?foo=bar' };
    return {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
  }

  function handlerThatEmits(value: unknown): CallHandler {
    return { handle: () => of(value) };
  }

  function handlerThatThrows(error: unknown): CallHandler {
    return { handle: () => throwError(() => error) };
  }

  it('passes non-HTTP contexts straight through without recording anything', async () => {
    // WebSocket gateway handlers (RealtimeGateway) go through this same
    // global interceptor — request/response don't exist there, so touching
    // them would throw.
    const wsContext = { getType: () => 'ws' } as unknown as ExecutionContext;
    const handler = handlerThatEmits('payload');

    const result = await firstValueFrom(interceptor.intercept(wsContext, handler));

    expect(result).toBe('payload');
    expect(metricsService.increment).not.toHaveBeenCalled();
  });

  it('records the real response status on success', async () => {
    const context = buildHttpContext(200);
    const handler = handlerThatEmits({ ok: true });

    const result = await firstValueFrom(interceptor.intercept(context, handler));

    expect(result).toEqual({ ok: true });
    expect(metricsService.increment).toHaveBeenCalledWith('http_requests_total', {
      method: 'GET',
      status: '200',
    });
  });

  it('strips the query string from the logged path', async () => {
    // buildHttpContext's request.originalUrl is '/api/vehicles?foo=bar' —
    // the logged line must not carry the query string along with it.
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const context = buildHttpContext(200);
    const handler = handlerThatEmits({ ok: true });

    await firstValueFrom(interceptor.intercept(context, handler));

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('GET /api/vehicles 200'));
    expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('foo=bar'));
    logSpy.mockRestore();
  });

  it('still records on a thrown exception, and re-throws it unchanged', async () => {
    const context = buildHttpContext(404);
    const boom = new Error('not found');
    const handler = handlerThatThrows(boom);

    await expect(firstValueFrom(interceptor.intercept(context, handler))).rejects.toBe(boom);
    expect(metricsService.increment).toHaveBeenCalledWith('http_requests_total', {
      method: 'GET',
      status: '404',
    });
  });

  it('falls back to 500 when the response has no status yet at error time', async () => {
    // The realistic case: HttpExceptionFilter hasn't run yet when this
    // interceptor's error handler fires, so response.statusCode can still be
    // unset.
    const context = buildHttpContext(undefined);
    const handler = handlerThatThrows(new Error('boom'));

    await expect(firstValueFrom(interceptor.intercept(context, handler))).rejects.toThrow('boom');
    expect(metricsService.increment).toHaveBeenCalledWith('http_requests_total', {
      method: 'GET',
      status: '500',
    });
  });
});
