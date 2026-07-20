import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/main.dart';

void main() {
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

  testWidgets('login navigates to home with valid input', (WidgetTester tester) async {
    await tester.pumpWidget(const NovaWayApp());
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextFormField, 'Email'), 'driver@novaway.vn');
    await tester.enterText(find.widgetWithText(TextFormField, 'Mật khẩu'), 'password123');
    await tester.tap(find.text('Đăng nhập'));
    await tester.pumpAndSettle();

    expect(find.text('Sẵn sàng cho hành trình thông minh tiếp theo.'), findsOneWidget);
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

  testWidgets('home logout navigates back to login', (WidgetTester tester) async {
    await tester.pumpWidget(const NovaWayApp());
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextFormField, 'Email'), 'driver@novaway.vn');
    await tester.enterText(find.widgetWithText(TextFormField, 'Mật khẩu'), 'password123');
    await tester.tap(find.text('Đăng nhập'));
    await tester.pumpAndSettle();

    await tester.tap(find.byIcon(Icons.logout));
    await tester.pumpAndSettle();

    expect(find.text('Đăng nhập NovaWay'), findsOneWidget);
  });
}
