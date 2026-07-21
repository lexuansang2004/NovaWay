enum RealtimeConnectionState { disconnected, connecting, connected, rejected }

class LocationUpdatePayload {
  final String tripId;
  final String clientEventId;
  final double latitude;
  final double longitude;
  final double speedKmh;
  final double accuracyM;
  final String timestamp;

  const LocationUpdatePayload({
    required this.tripId,
    required this.clientEventId,
    required this.latitude,
    required this.longitude,
    required this.speedKmh,
    required this.accuracyM,
    required this.timestamp,
  });
}

// Matches docs/API_CONTRACT.md §6 (namespace /realtime) as implemented by
// apps/backend/src/realtime/realtime.gateway.ts (step 3.1).
abstract class RealtimeClient {
  Stream<RealtimeConnectionState> get connectionState;
  Stream<String> get rejections; // error_code from location:rejected

  void connect(String token);
  void sendLocation(LocationUpdatePayload payload);
  void disconnect();
}
