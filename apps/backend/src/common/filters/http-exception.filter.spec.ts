import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

// R5-5 (docs/roadmap/SPRINT_R5_DEPENDENCY_AND_COVERAGE.md). This filter is
// registered globally in main.ts, so it decides the body of *every* error
// response the API ever returns — it is the implementation of
// docs/API_CONTRACT.md §8. A regression here breaks the contract every client
// depends on, and breaks it quietly: the HTTP status stays correct, only the
// body shape changes.

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let status: jest.Mock;
  let json: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;
  });

  const caught = () => ({
    status: status.mock.calls[0][0] as number,
    body: json.mock.calls[0][0] as { error_code: string; message: string },
  });

  it('passes through a body that already matches the contract shape', () => {
    // What every service in the codebase throws — see AuthService.login().
    filter.catch(
      new UnauthorizedException({
        error_code: 'INVALID_CREDENTIALS',
        message: 'Email hoặc mật khẩu không đúng.',
      }),
      host,
    );

    expect(caught()).toEqual({
      status: 401,
      body: { error_code: 'INVALID_CREDENTIALS', message: 'Email hoặc mật khẩu không đúng.' },
    });
  });

  it.each([
    [400, new BadRequestException(), HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR'],
    [401, new UnauthorizedException(), HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED'],
    [403, new ForbiddenException(), HttpStatus.FORBIDDEN, 'FORBIDDEN'],
    [404, new NotFoundException(), HttpStatus.NOT_FOUND, 'NOT_FOUND'],
    [409, new ConflictException(), HttpStatus.CONFLICT, 'CONFLICT'],
    [
      429,
      new HttpException('Too many', HttpStatus.TOO_MANY_REQUESTS),
      HttpStatus.TOO_MANY_REQUESTS,
      'RATE_LIMITED',
    ],
  ])('gives %d the error_code the contract defines for it', (
    _label,
    exception,
    expectedStatus,
    expectedCode,
  ) => {
    filter.catch(exception as HttpException, host);

    const { status: gotStatus, body } = caught();
    expect(gotStatus).toBe(expectedStatus);
    expect(body.error_code).toBe(expectedCode);
    expect(typeof body.message).toBe('string');
  });

  it('joins ValidationPipe’s array of messages into one string', () => {
    // ValidationPipe (main.ts, whitelist + forbidNonWhitelisted) reports every
    // failed constraint at once, as an array. The contract's `message` is a
    // single string, so they have to be joined rather than passed through.
    filter.catch(
      new BadRequestException({
        statusCode: 400,
        message: ['email must be an email', 'password should not be empty'],
        error: 'Bad Request',
      }),
      host,
    );

    expect(caught().body).toEqual({
      error_code: 'VALIDATION_ERROR',
      message: 'email must be an email; password should not be empty',
    });
  });

  it('falls back to INTERNAL_ERROR for a status with no mapping', () => {
    filter.catch(new HttpException('Service down', HttpStatus.SERVICE_UNAVAILABLE), host);

    expect(caught()).toEqual({
      status: 503,
      body: { error_code: 'INTERNAL_ERROR', message: 'Service down' },
    });
  });

  it('uses the exception message when the body is a bare string', () => {
    filter.catch(new HttpException('boom', HttpStatus.CONFLICT), host);

    expect(caught()).toEqual({ status: 409, body: { error_code: 'CONFLICT', message: 'boom' } });
  });

  it('never leaks details of a non-HttpException to the client', () => {
    // The important half of this test is the negative assertion: an unexpected
    // crash must not put connection strings, stack details or internal
    // identifiers into a response body.
    filter.catch(new Error('connect ECONNREFUSED 10.0.0.5:5432 as user novaway'), host);

    const { status: gotStatus, body } = caught();
    expect(gotStatus).toBe(500);
    expect(body).toEqual({ error_code: 'INTERNAL_ERROR', message: 'Internal server error' });
    expect(JSON.stringify(body)).not.toContain('ECONNREFUSED');
    expect(JSON.stringify(body)).not.toContain('novaway');
  });

  it('handles a thrown non-Error value without crashing the response', () => {
    filter.catch('something odd', host);

    expect(caught()).toEqual({
      status: 500,
      body: { error_code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });
});
