import 'package:mobile/repositories/api_exception.dart';
import 'package:mobile/repositories/auth_repository.dart';

class FakeAuthRepository implements AuthRepository {
  final bool loginShouldFail;
  final bool registerShouldFail;

  FakeAuthRepository({this.loginShouldFail = false, this.registerShouldFail = false});

  @override
  Future<LoginResult> login(String email, String password) async {
    if (loginShouldFail) {
      throw const ApiException(
        statusCode: 401,
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      );
    }
    return LoginResult(accessToken: 'fake-token', email: email);
  }

  @override
  Future<void> register(String email, String password) async {
    if (registerShouldFail) {
      throw const ApiException(
        statusCode: 409,
        errorCode: 'EMAIL_ALREADY_EXISTS',
        message: 'Email already exists',
      );
    }
  }
}
