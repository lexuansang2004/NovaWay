// Windows desktop default (only target verified via `flutter run -d windows`
// per docs/AGENTS.md — no emulator available). Android emulator needs
// --dart-define=API_BASE_URL=http://10.0.2.2:3000/api instead of localhost.
class ApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000/api',
  );
}
