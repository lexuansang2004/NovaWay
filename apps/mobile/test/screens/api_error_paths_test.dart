import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/main.dart';
import 'package:mobile/models/selectable_vehicle.dart';
import 'package:mobile/repositories/api_auth_repository.dart';
import 'package:mobile/repositories/api_vehicle_repository.dart';
import 'package:mobile/session/auth_session.dart';

import '../fakes/fake_auth_repository.dart';
import '../fakes/fake_vehicle_repository.dart';

Future<T> _withMock<T>(
  Future<http.Response> Function(http.Request) handler,
  Future<T> Function() body,
) => http.runWithClient(body, () => MockClient(handler));

http.Response _jsonResponse(Object body, int status) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json; charset=utf-8'},
);

Future<void> _openVehicleList(WidgetTester tester) async {
  await tester.pumpWidget(
    NovaWayApp(
      authRepository: FakeAuthRepository(),
      vehicleRepository: const ApiVehicleRepository(),
    ),
  );
  await tester.pumpAndSettle();
  await tester.enterText(
    find.widgetWithText(TextFormField, 'Email'),
    'driver@example.com',
  );
  await tester.enterText(
    find.widgetWithText(TextFormField, 'Mật khẩu'),
    'password123',
  );
  await tester.tap(find.text('Đăng nhập'));
  await tester.pumpAndSettle();
}

Future<void> _openRegister(WidgetTester tester) async {
  await tester.pumpWidget(
    const NovaWayApp(
      authRepository: ApiAuthRepository(),
      vehicleRepository: ApiVehicleRepository(),
    ),
  );
  await tester.pumpAndSettle();
  await tester.tap(find.text('Chưa có tài khoản? Đăng ký'));
  await tester.pumpAndSettle();
  await tester.enterText(
    find.widgetWithText(TextFormField, 'Email'),
    'driver@example.com',
  );
  await tester.enterText(
    find.widgetWithText(TextFormField, 'Mật khẩu'),
    'password123',
  );
  await tester.enterText(
    find.widgetWithText(TextFormField, 'Nhập lại mật khẩu'),
    'password123',
  );
}

void main() {
  setUp(AuthSession.clear);
  tearDown(AuthSession.clear);

  group('VehicleListScreen API error paths', () {
    testWidgets('shows API message, then retries into the loaded state', (
      tester,
    ) async {
      var vehicleRequests = 0;
      await _withMock(
        (request) async {
          if (request.url.path.endsWith('/vehicles')) {
            vehicleRequests++;
            if (vehicleRequests == 1) {
              return _jsonResponse({
                'error_code': 'SERVICE_UNAVAILABLE',
                'message': 'Dịch vụ tạm thời chưa sẵn sàng.',
              }, 503);
            }
            return _jsonResponse({'vehicles': <dynamic>[]}, 200);
          }
          return _jsonResponse({'authorizations': <dynamic>[]}, 200);
        },
        () async {
          await _openVehicleList(tester);
          expect(find.text('Dịch vụ tạm thời chưa sẵn sàng.'), findsOneWidget);
          expect(find.text('Thử lại'), findsOneWidget);

          await tester.tap(find.text('Thử lại'));
          await tester.pumpAndSettle();
          expect(vehicleRequests, 2);
          expect(find.text('Bạn chưa có phương tiện nào.'), findsOneWidget);
          expect(find.text('Thử lại'), findsNothing);
        },
      );
    });

    testWidgets('shows network fallback, then retries into a vehicle list', (
      tester,
    ) async {
      var vehicleRequests = 0;
      await _withMock(
        (request) async {
          if (request.url.path.endsWith('/vehicles')) {
            vehicleRequests++;
            if (vehicleRequests == 1) throw Exception('network unavailable');
            return _jsonResponse({
              'vehicles': [
                {
                  'id': 'vehicle-1',
                  'type': 'motorbike',
                  'license_plate': '59A-12345',
                  'brand_model': null,
                },
              ],
            }, 200);
          }
          return _jsonResponse({'authorizations': <dynamic>[]}, 200);
        },
        () async {
          await _openVehicleList(tester);
          expect(
            find.text('Không kết nối được máy chủ. Vui lòng thử lại.'),
            findsOneWidget,
          );

          await tester.tap(find.text('Thử lại'));
          await tester.pumpAndSettle();
          expect(vehicleRequests, 2);
          expect(find.text('59A-12345'), findsOneWidget);
        },
      );
    });

    testWidgets('keeps borrowed vehicle label and logout available', (
      tester,
    ) async {
      const borrowed = SelectableVehicle(
        id: 'borrowed-1',
        type: 'car',
        licensePlate: '51F-22222',
        brandModel: null,
        role: VehicleRole.borrower,
      );
      const owned = SelectableVehicle(
        id: 'owned-1',
        type: 'motorbike',
        licensePlate: '59A-12345',
        brandModel: null,
        role: VehicleRole.owner,
      );
      await tester.pumpWidget(
        NovaWayApp(
          authRepository: FakeAuthRepository(),
          vehicleRepository: const FakeVehicleRepository([borrowed, owned]),
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'driver@example.com',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Mật khẩu'),
        'password123',
      );
      await tester.tap(find.text('Đăng nhập'));
      await tester.pumpAndSettle();

      expect(find.text('Được uỷ quyền'), findsOneWidget);
      await tester.tap(find.byIcon(Icons.logout));
      await tester.pumpAndSettle();
      expect(find.text('Đăng nhập NovaWay'), findsOneWidget);
      expect(AuthSession.token, isNull);
    });
  });

  group('RegisterScreen API error paths', () {
    testWidgets('maps EMAIL_ALREADY_EXISTS and permits resubmission', (
      tester,
    ) async {
      var registerRequests = 0;
      await _withMock(
        (request) async {
          if (request.url.path.endsWith('/auth/register')) {
            registerRequests++;
            if (registerRequests == 1) {
              return _jsonResponse({
                'error_code': 'EMAIL_ALREADY_EXISTS',
                'message': 'Backend message should not be shown.',
              }, 409);
            }
            return _jsonResponse({}, 201);
          }
          if (request.url.path.endsWith('/auth/login')) {
            return _jsonResponse({
              'access_token': 'test-token',
              'user': {'id': 'user-1', 'email': 'driver@example.com'},
            }, 200);
          }
          if (request.url.path.endsWith('/vehicles')) {
            return _jsonResponse({'vehicles': <dynamic>[]}, 200);
          }
          return _jsonResponse({'authorizations': <dynamic>[]}, 200);
        },
        () async {
          await _openRegister(tester);
          await tester.tap(find.text('Đăng ký'));
          await tester.pumpAndSettle();
          expect(find.text('Email đã được sử dụng.'), findsOneWidget);
          expect(
            find.text('Backend message should not be shown.'),
            findsNothing,
          );

          await tester.tap(find.text('Đăng ký'));
          await tester.pumpAndSettle();
          expect(registerRequests, 2);
          expect(find.text('Chọn phương tiện'), findsOneWidget);
          expect(find.text('Email đã được sử dụng.'), findsNothing);
        },
      );
    });

    testWidgets('shows non-duplicate ApiException message', (tester) async {
      await _withMock(
        (request) async => _jsonResponse({
          'error_code': 'SERVICE_UNAVAILABLE',
          'message': 'Đăng ký tạm thời không khả dụng.',
        }, 503),
        () async {
          await _openRegister(tester);
          await tester.tap(find.text('Đăng ký'));
          await tester.pumpAndSettle();
          expect(find.text('Đăng ký tạm thời không khả dụng.'), findsOneWidget);
          expect(find.text('Đăng ký'), findsOneWidget);
        },
      );
    });

    testWidgets('shows network fallback without leaving the form', (
      tester,
    ) async {
      await _withMock(
        (_) async => throw Exception('network unavailable'),
        () async {
          await _openRegister(tester);
          await tester.tap(find.text('Đăng ký'));
          await tester.pumpAndSettle();
          expect(
            find.text('Không kết nối được máy chủ. Vui lòng thử lại.'),
            findsOneWidget,
          );
          expect(find.text('Tạo tài khoản NovaWay'), findsOneWidget);
          expect(find.text('Đăng ký'), findsOneWidget);
        },
      );
    });

    testWidgets('password visibility and return to login remain available', (
      tester,
    ) async {
      await _openRegister(tester);
      expect(find.byIcon(Icons.visibility_off), findsOneWidget);
      await tester.tap(find.byIcon(Icons.visibility_off));
      await tester.pump();
      expect(find.byIcon(Icons.visibility), findsOneWidget);
      await tester.tap(find.text('Đã có tài khoản? Đăng nhập'));
      await tester.pumpAndSettle();
      expect(find.text('Đăng nhập NovaWay'), findsOneWidget);
    });
  });
}
