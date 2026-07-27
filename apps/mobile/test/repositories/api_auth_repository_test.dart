import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/repositories/api_auth_repository.dart';
import 'package:mobile/repositories/api_exception.dart';

// R5-7 (docs/roadmap/SPRINT_R5_DEPENDENCY_AND_COVERAGE.md). Every other
// mobile test exercises FakeAuthRepository, so this real HTTP code — JSON
// encoding, status branching, error mapping — has never actually run in a
// test. ApiAuthRepository calls the http package's top-level get/post
// functions directly (no injected client), so there is no constructor seam
// to override. `http.testing.MockClient` + `http.runWithClient` is the
// package's own supported way to fake those top-level calls via a Zone —
// no refactor of the class under test needed.

void main() {
  const repo = ApiAuthRepository();

  Future<T> withMock<T>(
    Future<http.Response> Function(http.Request) handler,
    Future<T> Function() body,
  ) {
    return http.runWithClient(body, () => MockClient(handler));
  }

  // Response's default encoding is Latin1 unless the Content-Type header
  // says otherwise — needed because the backend's real error messages are
  // Vietnamese (đã, ự, …), which aren't representable in Latin1.
  http.Response utf8Json(Map<String, dynamic> body, int status) =>
      http.Response(
        jsonEncode(body),
        status,
        headers: {'content-type': 'application/json; charset=utf-8'},
      );

  group('login', () {
    test('returns accessToken and email on 200', () async {
      final result = await withMock(
        (request) async {
          expect(request.method, 'POST');
          expect(request.url.path, '/api/auth/login');
          expect(
            jsonDecode(request.body),
            {'email': 'driver@example.com', 'password': 'pw'},
          );
          return utf8Json({
            'access_token': 'jwt-token',
            'user': {'id': 'u1', 'email': 'driver@example.com'},
          }, 200);
        },
        () => repo.login('driver@example.com', 'pw'),
      );

      expect(result.accessToken, 'jwt-token');
      expect(result.email, 'driver@example.com');
    });

    test('throws ApiException with the contract fields on 401', () async {
      await expectLater(
        withMock(
          (_) async => utf8Json({
            'error_code': 'INVALID_CREDENTIALS',
            'message': 'Email hoặc mật khẩu không đúng.',
          }, 401),
          () => repo.login('driver@example.com', 'wrong'),
        ),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 401)
              .having((e) => e.errorCode, 'errorCode', 'INVALID_CREDENTIALS')
              .having(
                (e) => e.message,
                'message',
                'Email hoặc mật khẩu không đúng.',
              ),
        ),
      );
    });

    test('falls back to a default error_code/message when the body omits them', () async {
      await expectLater(
        withMock(
          (_) async => utf8Json({}, 500),
          () => repo.login('driver@example.com', 'pw'),
        ),
        throwsA(
          isA<ApiException>()
              .having((e) => e.errorCode, 'errorCode', 'UNKNOWN_ERROR')
              .having((e) => e.message, 'message', 'Đăng nhập thất bại.'),
        ),
      );
    });

    test('degrades to ApiException, not FormatException, when a failed response is not JSON', () async {
      // R5-7: a proxy/load balancer returning an HTML error page on a 502 is
      // the realistic case status is checked before jsonDecode is attempted.
      await expectLater(
        withMock(
          (_) async => http.Response('<html>502 Bad Gateway</html>', 502),
          () => repo.login('driver@example.com', 'pw'),
        ),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 502)
              .having((e) => e.errorCode, 'errorCode', 'UNKNOWN_ERROR')
              .having((e) => e.message, 'message', 'Đăng nhập thất bại.'),
        ),
      );
    });
  });

  group('register', () {
    test('completes without throwing on 201', () async {
      await withMock(
        (request) async {
          expect(request.url.path, '/api/auth/register');
          return http.Response('', 201);
        },
        () => repo.register('new@example.com', 'pw'),
      );
    });

    test('throws ApiException on 409 (email already exists)', () async {
      await expectLater(
        withMock(
          (_) async => utf8Json({
            'error_code': 'EMAIL_ALREADY_EXISTS',
            'message': 'Email đã được sử dụng.',
          }, 409),
          () => repo.register('dup@example.com', 'pw'),
        ),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 409)
              .having((e) => e.errorCode, 'errorCode', 'EMAIL_ALREADY_EXISTS'),
        ),
      );
    });
  });
}
