import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/main.dart';
import 'package:mobile/models/selectable_vehicle.dart';
import 'package:mobile/session/auth_session.dart';

import 'fakes/fake_auth_repository.dart';
import 'fakes/fake_vehicle_repository.dart';

const _testVehicle = SelectableVehicle(
  id: 'a1111111-1111-4111-8111-111111111111',
  type: 'motorbike',
  licensePlate: '59A-12345',
  brandModel: 'Honda SH',
  role: VehicleRole.owner,
);

Future<void> _login(WidgetTester tester) async {
  await tester.enterText(find.widgetWithText(TextFormField, 'Email'), 'driver@novaway.vn');
  await tester.enterText(find.widgetWithText(TextFormField, 'Mật khẩu'), 'password123');
  await tester.tap(find.text('Đăng nhập'));
  await tester.pumpAndSettle();
}

void main() {
  setUp(() {
    AuthSession.clear();
  });

  testWidgets('splash navigates to login', (WidgetTester tester) async {
    await tester.pumpWidget(const NovaWayApp());
    await tester.pumpAndSettle();

    expect(find.text('Đăng nhập NovaWay'), findsOneWidget);
  });

  testWidgets('login shows validation errors on empty submit', (WidgetTester tester) async {
    await tester.pumpWidget(const NovaWayApp());
    await tester.pumpAndSettle();

    await tester.tap(find.text('Đăng nhập'));
    await tester.pump();

    expect(find.text('Vui lòng nhập email.'), findsOneWidget);
    expect(find.text('Vui lòng nhập mật khẩu.'), findsOneWidget);
  });

  testWidgets('login with valid credentials navigates to vehicle list', (WidgetTester tester) async {
    await tester.pumpWidget(NovaWayApp(
      authRepository: FakeAuthRepository(),
      vehicleRepository: const FakeVehicleRepository([_testVehicle]),
    ));
    await tester.pumpAndSettle();

    await _login(tester);

    expect(find.text('Chọn phương tiện'), findsOneWidget);
    expect(find.text('59A-12345'), findsOneWidget);
  });

  testWidgets('login shows error message on invalid credentials', (WidgetTester tester) async {
    await tester.pumpWidget(NovaWayApp(
      authRepository: FakeAuthRepository(loginShouldFail: true),
      vehicleRepository: const FakeVehicleRepository([_testVehicle]),
    ));
    await tester.pumpAndSettle();

    await _login(tester);

    expect(find.text('Email hoặc mật khẩu không đúng.'), findsOneWidget);
    expect(find.text('Đăng nhập NovaWay'), findsOneWidget);
  });

  testWidgets('vehicle list shows empty state when user has no vehicles', (WidgetTester tester) async {
    await tester.pumpWidget(NovaWayApp(
      authRepository: FakeAuthRepository(),
      vehicleRepository: const FakeVehicleRepository([]),
    ));
    await tester.pumpAndSettle();

    await _login(tester);

    expect(find.text('Bạn chưa có phương tiện nào.'), findsOneWidget);
  });

  testWidgets('selecting a vehicle navigates to home screen with vehicle info', (WidgetTester tester) async {
    await tester.pumpWidget(NovaWayApp(
      authRepository: FakeAuthRepository(),
      vehicleRepository: const FakeVehicleRepository([_testVehicle]),
    ));
    await tester.pumpAndSettle();

    await _login(tester);

    await tester.tap(find.text('59A-12345'));
    await tester.pumpAndSettle();

    expect(find.text('Sẵn sàng cho hành trình thông minh tiếp theo.'), findsOneWidget);
    expect(find.text('Honda SH'), findsOneWidget);
  });

  testWidgets('login link navigates to register screen', (WidgetTester tester) async {
    await tester.pumpWidget(const NovaWayApp());
    await tester.pumpAndSettle();

    await tester.tap(find.text('Chưa có tài khoản? Đăng ký'));
    await tester.pumpAndSettle();

    expect(find.text('Tạo tài khoản NovaWay'), findsOneWidget);
  });

  testWidgets('register validates password confirmation mismatch', (WidgetTester tester) async {
    await tester.pumpWidget(const NovaWayApp());
    await tester.pumpAndSettle();
    await tester.tap(find.text('Chưa có tài khoản? Đăng ký'));
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextFormField, 'Email'), 'driver@novaway.vn');
    await tester.enterText(find.widgetWithText(TextFormField, 'Mật khẩu'), 'password123');
    await tester.enterText(find.widgetWithText(TextFormField, 'Nhập lại mật khẩu'), 'different123');
    await tester.tap(find.text('Đăng ký'));
    await tester.pump();

    expect(find.text('Mật khẩu nhập lại không khớp.'), findsOneWidget);
  });

  testWidgets('register success navigates to vehicle list', (WidgetTester tester) async {
    await tester.pumpWidget(NovaWayApp(
      authRepository: FakeAuthRepository(),
      vehicleRepository: const FakeVehicleRepository([_testVehicle]),
    ));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Chưa có tài khoản? Đăng ký'));
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextFormField, 'Email'), 'driver@novaway.vn');
    await tester.enterText(find.widgetWithText(TextFormField, 'Mật khẩu'), 'password123');
    await tester.enterText(find.widgetWithText(TextFormField, 'Nhập lại mật khẩu'), 'password123');
    await tester.tap(find.text('Đăng ký'));
    await tester.pumpAndSettle();

    expect(find.text('Chọn phương tiện'), findsOneWidget);
  });

  testWidgets('home logout navigates back to login', (WidgetTester tester) async {
    await tester.pumpWidget(NovaWayApp(
      authRepository: FakeAuthRepository(),
      vehicleRepository: const FakeVehicleRepository([_testVehicle]),
    ));
    await tester.pumpAndSettle();

    await _login(tester);
    await tester.tap(find.text('59A-12345'));
    await tester.pumpAndSettle();

    await tester.tap(find.byIcon(Icons.logout));
    await tester.pumpAndSettle();

    expect(find.text('Đăng nhập NovaWay'), findsOneWidget);
  });
}
