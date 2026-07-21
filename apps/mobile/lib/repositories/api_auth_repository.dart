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

    final body = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode != 200) {
      throw ApiException(
        statusCode: response.statusCode,
        errorCode: (body['error_code'] as String?) ?? 'UNKNOWN_ERROR',
        message: (body['message'] as String?) ?? 'Đăng nhập thất bại.',
      );
    }

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
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      throw ApiException(
        statusCode: response.statusCode,
        errorCode: (body['error_code'] as String?) ?? 'UNKNOWN_ERROR',
        message: (body['message'] as String?) ?? 'Đăng ký thất bại.',
      );
    }
  }
}
