import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/models/selectable_vehicle.dart';
import 'package:mobile/screens/trip_cockpit_screen.dart';
import 'package:mobile/services/location_source.dart';
import 'package:mobile/session/auth_session.dart';

import 'fakes/fake_location_source.dart';
import 'fakes/fake_realtime_client.dart';

const _testVehicle = SelectableVehicle(
  id: 'a1111111-1111-4111-8111-111111111111',
  type: 'motorbike',
  licensePlate: '59A-12345',
  brandModel: 'Honda SH',
  role: VehicleRole.owner,
);

const _testTripId = 'b2222222-2222-4222-8222-222222222222';

void main() {
  setUp(() {
    AuthSession.set(token: 'fake-token', userEmail: 'driver@novaway.vn');
  });

  tearDown(() {
    AuthSession.clear();
  });

  testWidgets('permission denied blocks start and shows message', (WidgetTester tester) async {
    final client = FakeRealtimeClient();
    await tester.pumpWidget(
      MaterialApp(
        home: TripCockpitScreen(
          vehicle: _testVehicle,
          tripId: _testTripId,
          locationSource: FakeLocationSource(permissionResult: LocationPermissionResult.denied),
          realtimeClient: client,
        ),
      ),
    );

    await tester.tap(find.text('Bắt đầu'));
    await tester.pumpAndSettle();

    expect(find.text('Chưa có quyền vị trí'), findsOneWidget);
    expect(client.connectCalled, isFalse);
  });

  testWidgets('disabled location service blocks start and shows message', (WidgetTester tester) async {
    final client = FakeRealtimeClient();
    await tester.pumpWidget(
      MaterialApp(
        home: TripCockpitScreen(
          vehicle: _testVehicle,
          tripId: _testTripId,
          locationSource: FakeLocationSource(permissionResult: LocationPermissionResult.serviceDisabled),
          realtimeClient: client,
        ),
      ),
    );

    await tester.tap(find.text('Bắt đầu'));
    await tester.pumpAndSettle();

    expect(find.text('Dịch vụ định vị đang tắt'), findsOneWidget);
    expect(client.connectCalled, isFalse);
  });

  testWidgets('empty trip id blocks start with unavailable message', (WidgetTester tester) async {
    final client = FakeRealtimeClient();
    await tester.pumpWidget(
      MaterialApp(
        home: TripCockpitScreen(
          vehicle: _testVehicle,
          tripId: '',
          locationSource: FakeLocationSource(),
          realtimeClient: client,
        ),
      ),
    );

    await tester.tap(find.text('Bắt đầu'));
    await tester.pumpAndSettle();

    expect(find.text('Chưa thể bắt đầu chuyến đi'), findsOneWidget);
    expect(client.connectCalled, isFalse);
  });

  testWidgets('start connects, tracks position and sends location updates', (WidgetTester tester) async {
    final client = FakeRealtimeClient();
    final location = FakeLocationSource();
    await tester.pumpWidget(
      MaterialApp(
        home: TripCockpitScreen(
          vehicle: _testVehicle,
          tripId: _testTripId,
          locationSource: location,
          realtimeClient: client,
        ),
      ),
    );

    await tester.tap(find.text('Bắt đầu'));
    await tester.pumpAndSettle();

    expect(client.connectCalled, isTrue);
    expect(find.text('Đang theo dõi vị trí'), findsOneWidget);
    expect(find.text('Dừng'), findsOneWidget);

    location.emit(const LocationFix(latitude: 10.8, longitude: 106.7, speedKmh: 42.5, accuracyM: 5));
    await tester.pumpAndSettle();

    expect(find.text('42.5 km/h'), findsOneWidget);
    expect(client.sentLocations, hasLength(1));
    expect(client.sentLocations.single.tripId, _testTripId);
  });

  testWidgets('stop disconnects and resets state', (WidgetTester tester) async {
    final client = FakeRealtimeClient();
    final location = FakeLocationSource();
    await tester.pumpWidget(
      MaterialApp(
        home: TripCockpitScreen(
          vehicle: _testVehicle,
          tripId: _testTripId,
          locationSource: location,
          realtimeClient: client,
        ),
      ),
    );

    await tester.tap(find.text('Bắt đầu'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Dừng'));
    await tester.pumpAndSettle();

    expect(client.disconnectCalled, isTrue);
    expect(find.text('Sẵn sàng bắt đầu'), findsOneWidget);
    expect(find.text('Bắt đầu'), findsOneWidget);
  });

  testWidgets('server-initiated socket disconnect while tracking resets UI without crashing',
      (WidgetTester tester) async {
    final client = FakeRealtimeClient();
    final location = FakeLocationSource();
    await tester.pumpWidget(
      MaterialApp(
        home: TripCockpitScreen(
          vehicle: _testVehicle,
          tripId: _testTripId,
          locationSource: location,
          realtimeClient: client,
        ),
      ),
    );

    await tester.tap(find.text('Bắt đầu'));
    await tester.pumpAndSettle();
    expect(find.text('Đang theo dõi vị trí'), findsOneWidget);

    client.simulateServerDisconnect();
    await tester.pumpAndSettle();

    expect(find.text('Mất kết nối tới máy chủ.'), findsOneWidget);
    expect(find.text('Bắt đầu'), findsOneWidget);
  });

  testWidgets('reconnect does not duplicate location sends for a single position fix',
      (WidgetTester tester) async {
    final client = FakeRealtimeClient();
    final location = FakeLocationSource();
    await tester.pumpWidget(
      MaterialApp(
        home: TripCockpitScreen(
          vehicle: _testVehicle,
          tripId: _testTripId,
          locationSource: location,
          realtimeClient: client,
        ),
      ),
    );

    await tester.tap(find.text('Bắt đầu'));
    await tester.pumpAndSettle();

    // Simulates a real socket.io reconnect re-emitting `connected` without
    // an intervening `disconnected` — regression test for the subscription
    // leak found during R3-2's real-browser verify (docs/roadmap/
    // OPEN_ITEMS_AFTER_MVP.md §7): without the fix, this stacks a second
    // parallel position-stream subscription.
    client.simulateReconnect();
    await tester.pumpAndSettle();

    location.emit(const LocationFix(latitude: 10.8, longitude: 106.7, speedKmh: 42.5, accuracyM: 5));
    await tester.pumpAndSettle();

    expect(client.sentLocations, hasLength(1));
  });

  // R2-4: maplibre_gl renders via a native platform view (AndroidView/
  // UiKitView/WebView), not a Dart widget tree — flutter_test's headless
  // environment has no platform-view renderer, so onMapCreated/
  // onStyleLoadedCallback never fire and there is no Dart-level marker
  // widget to find.byKey (annotations are native map-layer objects, not
  // Flutter widgets). This replaces the old R1-5 test's marker assertion
  // (find.byKey('trip-position-marker')) with a presence-only check that
  // the map widget itself is mounted. See docs/roadmap/OPEN_ITEMS_AFTER_MVP.md §7.
  testWidgets('shows the map widget (R2-4)', (WidgetTester tester) async {
    final client = FakeRealtimeClient();
    final location = FakeLocationSource();
    await tester.pumpWidget(
      MaterialApp(
        home: TripCockpitScreen(
          vehicle: _testVehicle,
          tripId: _testTripId,
          locationSource: location,
          realtimeClient: client,
        ),
      ),
    );

    expect(find.byKey(const Key('trip-map')), findsOneWidget);

    await tester.tap(find.text('Bắt đầu'));
    await tester.pumpAndSettle();

    location.emit(const LocationFix(latitude: 10.8, longitude: 106.7, speedKmh: 30, accuracyM: 5));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('trip-map')), findsOneWidget);
  });
}
