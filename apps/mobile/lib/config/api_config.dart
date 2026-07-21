// Windows desktop default (only target verified via `flutter run -d windows`
// per docs/AGENTS.md — no emulator available). Android emulator needs
// --dart-define=API_BASE_URL=http://10.0.2.2:3000/api instead of localhost.
class ApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000/api',
  );

  // Socket.IO connects to the bare host, not the REST /api prefix.
  static const String socketBaseUrl = String.fromEnvironment(
    'SOCKET_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  // No POST /trips endpoint exists yet (that's step 7.1) — until then, a
  // trip row must be provisioned manually (SQL/curl) for real-device
  // verification, and its id passed in here. Empty disables trip start.
  static const String debugTripId = String.fromEnvironment('DEBUG_TRIP_ID', defaultValue: '');
}
