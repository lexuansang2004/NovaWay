// Mirrors the {error_code, message} convention from docs/API_CONTRACT.md §8,
// same convention apps/web's ApiError already follows.
class ApiException implements Exception {
  final int statusCode;
  final String errorCode;
  final String message;

  const ApiException({
    required this.statusCode,
    required this.errorCode,
    required this.message,
  });

  @override
  String toString() => 'ApiException($statusCode, $errorCode, $message)';
}
