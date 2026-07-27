import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/models/selectable_vehicle.dart';
import 'package:mobile/repositories/api_exception.dart';
import 'package:mobile/repositories/api_vehicle_repository.dart';
import 'package:mobile/session/auth_session.dart';

// R5-7 (docs/roadmap/SPRINT_R5_DEPENDENCY_AND_COVERAGE.md). Companion to
// api_auth_repository_test.dart — same MockClient + runWithClient seam,
// covering the class every mobile test otherwise bypasses via
// FakeVehicleRepository: real JSON parsing, the owned+borrowed merge, and
// the active-only filter on authorizations.

void main() {
  const repo = ApiVehicleRepository();

  setUp(() {
    AuthSession.set(token: 'test-token', userEmail: 'driver@example.com');
  });

  tearDown(AuthSession.clear);

  Future<T> withMock<T>(
    Future<http.Response> Function(http.Request) handler,
    Future<T> Function() body,
  ) {
    return http.runWithClient(body, () => MockClient(handler));
  }

  http.Response utf8Json(Object body, int status) => http.Response(
        jsonEncode(body),
        status,
        headers: {'content-type': 'application/json; charset=utf-8'},
      );

  test('sends the AuthSession token as a Bearer header on every request', () async {
    final authHeaders = <String>[];

    await withMock(
      (request) async {
        authHeaders.add(request.headers['Authorization'] ?? '');
        if (request.url.path.endsWith('/vehicles')) {
          return utf8Json({'vehicles': <dynamic>[]}, 200);
        }
        return utf8Json({'authorizations': <dynamic>[]}, 200);
      },
      () => repo.fetchSelectableVehicles(),
    );

    expect(authHeaders, everyElement('Bearer test-token'));
  });

  test('merges owned vehicles with active-only borrowed vehicles', () async {
    final result = await withMock(
      (request) async {
        if (request.url.path.endsWith('/vehicles')) {
          return utf8Json({
            'vehicles': [
              {
                'id': 'owned-1',
                'type': 'motorbike',
                'license_plate': '51F-111.11',
                'brand_model': 'Honda Wave',
              },
            ],
          }, 200);
        }
        // authorizations/me — one active, one revoked. Only the active one
        // should survive into the merged list.
        return utf8Json({
          'authorizations': [
            {
              'status': 'active',
              'vehicle': {
                'id': 'borrowed-active',
                'type': 'car',
                'license_plate': '51F-222.22',
                'brand_model': null,
              },
            },
            {
              'status': 'revoked',
              'vehicle': {
                'id': 'borrowed-revoked',
                'type': 'car',
                'license_plate': '51F-333.33',
                'brand_model': 'Toyota Vios',
              },
            },
          ],
        }, 200);
      },
      () => repo.fetchSelectableVehicles(),
    );

    expect(result, hasLength(2));

    final owned = result.firstWhere((v) => v.id == 'owned-1');
    expect(owned.role, VehicleRole.owner);
    expect(owned.licensePlate, '51F-111.11');
    expect(owned.brandModel, 'Honda Wave');

    final borrowed = result.firstWhere((v) => v.id == 'borrowed-active');
    expect(borrowed.role, VehicleRole.borrower);
    expect(borrowed.brandModel, isNull);

    expect(result.any((v) => v.id == 'borrowed-revoked'), isFalse);
  });

  test('returns an empty list when the user has no vehicles or authorizations', () async {
    final result = await withMock(
      (request) async => utf8Json(
        request.url.path.endsWith('/vehicles')
            ? {'vehicles': <dynamic>[]}
            : {'authorizations': <dynamic>[]},
        200,
      ),
      () => repo.fetchSelectableVehicles(),
    );

    expect(result, isEmpty);
  });

  test('throws ApiException with the contract fields when /vehicles fails', () async {
    await expectLater(
      withMock(
        (_) async => utf8Json({
          'error_code': 'UNAUTHORIZED',
          'message': 'Phiên đăng nhập đã hết hạn.',
        }, 401),
        () => repo.fetchSelectableVehicles(),
      ),
      throwsA(
        isA<ApiException>()
            .having((e) => e.statusCode, 'statusCode', 401)
            .having((e) => e.errorCode, 'errorCode', 'UNAUTHORIZED'),
      ),
    );
  });

  test('degrades to ApiException, not FormatException, when a failed /vehicles response is not JSON', () async {
    // R5-7: mirrors api_auth_repository_test.dart — status is checked before
    // jsonDecode, so a malformed error body (proxy HTML on a 502) degrades
    // gracefully instead of throwing FormatException.
    await expectLater(
      withMock(
        (_) async => http.Response('<html>502 Bad Gateway</html>', 502),
        () => repo.fetchSelectableVehicles(),
      ),
      throwsA(
        isA<ApiException>()
            .having((e) => e.statusCode, 'statusCode', 502)
            .having((e) => e.errorCode, 'errorCode', 'UNKNOWN_ERROR')
            .having((e) => e.message, 'message', 'Không lấy được danh sách xe.'),
      ),
    );
  });

  test('throws ApiException when /authorizations/me fails, even if /vehicles succeeded', () async {
    // fetchSelectableVehicles awaits owned then borrowed sequentially
    // (repositories/api_vehicle_repository.dart) — the first call succeeding
    // must not swallow a failure in the second.
    await expectLater(
      withMock(
        (request) async {
          if (request.url.path.endsWith('/vehicles')) {
            return utf8Json({'vehicles': <dynamic>[]}, 200);
          }
          return utf8Json({
            'error_code': 'INTERNAL_ERROR',
            'message': 'Internal server error',
          }, 500);
        },
        () => repo.fetchSelectableVehicles(),
      ),
      throwsA(isA<ApiException>().having((e) => e.statusCode, 'statusCode', 500)),
    );
  });
}
