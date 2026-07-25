import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/services/realtime_client.dart';
import 'package:mobile/services/socket_io_realtime_client.dart';

// SocketIoRealtimeClient wraps a real socket_io_client Socket that it
// constructs internally — there is no injection seam, so these tests only
// cover the parts of the real class observable without a live server: the
// synchronous state-stream contract and the null-safety guards that apply
// before any connection has actually been established. The full
// connect/receive/broadcast lifecycle is covered by the E2E golden-path
// suite (apps/web/e2e/golden-path.spec.ts) against a real backend.
void main() {
  test('connect() emits connecting on the connectionState stream before any I/O', () async {
    final client = SocketIoRealtimeClient();
    final states = <RealtimeConnectionState>[];
    final subscription = client.connectionState.listen(states.add);

    client.connect('fake-token');
    await Future<void>.delayed(Duration.zero);

    expect(states, isNotEmpty);
    expect(states.first, RealtimeConnectionState.connecting);

    client.disconnect();
    await subscription.cancel();
  });

  test('disconnect() before connect() does not throw and emits disconnected', () async {
    final client = SocketIoRealtimeClient();
    final states = <RealtimeConnectionState>[];
    final subscription = client.connectionState.listen(states.add);

    expect(client.disconnect, returnsNormally);
    await Future<void>.delayed(Duration.zero);

    expect(states, contains(RealtimeConnectionState.disconnected));
    await subscription.cancel();
  });

  test('sendLocation() before connect() does not throw (null-safe guard)', () {
    final client = SocketIoRealtimeClient();

    expect(
      () => client.sendLocation(
        const LocationUpdatePayload(
          tripId: 'trip-1',
          clientEventId: 'event-1',
          latitude: 10.77,
          longitude: 106.7,
          speedKmh: 20,
          accuracyM: 5,
          timestamp: '2026-01-01T00:00:00.000Z',
        ),
      ),
      returnsNormally,
    );

    client.disconnect();
  });

  test('connect() then disconnect() tears down without throwing', () async {
    final client = SocketIoRealtimeClient();
    final states = <RealtimeConnectionState>[];
    final subscription = client.connectionState.listen(states.add);

    client.connect('fake-token');
    await Future<void>.delayed(Duration.zero);
    expect(client.disconnect, returnsNormally);
    await Future<void>.delayed(Duration.zero);

    expect(states, [RealtimeConnectionState.connecting, RealtimeConnectionState.disconnected]);
    await subscription.cancel();
  });
}
