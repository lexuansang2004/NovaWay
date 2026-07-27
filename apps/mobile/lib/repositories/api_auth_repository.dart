import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'api_exception.dart';
import 'auth_repository.dart';

class ApiAuthRepository implements AuthRepository {
  const ApiAuthRepository();

  @override
  Future<LoginResult> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (response.statusCode != 200) {
      // R5-7: status is checked before decoding — same order register()
      // already used below — so a malformed error body (e.g. HTML from a
      // proxy on a 502) degrades to ApiException's UNKNOWN_ERROR fallback
      // instead of throwing FormatException from a successful-response
      // assumption that no longer holds.
      final errorBody = _tryDecode(response.body);
      throw ApiException(
        statusCode: response.statusCode,
        errorCode: (errorBody?['error_code'] as String?) ?? 'UNKNOWN_ERROR',
        message: (errorBody?['message'] as String?) ?? 'Đăng nhập thất bại.',
      );
    }

    final body = jsonDecode(response.body) as Map<String, dynamic>;
    final user = body['user'] as Map<String, dynamic>;
    return LoginResult(
      accessToken: body['access_token'] as String,
      email: user['email'] as String,
    );
  }

  @override
  Future<void> register(String email, String password) async {
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (response.statusCode != 201) {
      final errorBody = _tryDecode(response.body);
      throw ApiException(
        statusCode: response.statusCode,
        errorCode: (errorBody?['error_code'] as String?) ?? 'UNKNOWN_ERROR',
        message: (errorBody?['message'] as String?) ?? 'Đăng ký thất bại.',
      );
    }
  }
}

/// Returns the decoded body, or null if it isn't valid JSON — a malformed
/// error response (proxy HTML, empty body) degrades to the caller's
/// ??-fallback message instead of throwing FormatException.
Map<String, dynamic>? _tryDecode(String body) {
  try {
    return jsonDecode(body) as Map<String, dynamic>;
  } on FormatException {
    return null;
  }
}
