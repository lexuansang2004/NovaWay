// localhost default. Android emulator needs
// --dart-define=API_BASE_URL=http://10.0.2.2:3000/api instead of localhost.
// R2-4: maplibre_gl only supports android/ios/web (no Windows), so the real
// device/browser verification target for this app is now `flutter run -d
// chrome` — see docs/roadmap/OPEN_ITEMS_AFTER_MVP.md §7.
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

  // R2-4 — Protomaps hosted API key, same provider as apps/web's TripMap.tsx
  // (docs/architecture/TDR-tile-provider-spike.md, R1-7). Free key at
  // protomaps.com/account. Empty means the map mounts but tiles 401/403 —
  // matches apps/web's TripMap.tsx behavior for a missing key.
  static const String protomapsApiKey = String.fromEnvironment('PROTOMAPS_API_KEY', defaultValue: '');
}
