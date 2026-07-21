class LoginResult {
  final String accessToken;
  final String email;

  const LoginResult({required this.accessToken, required this.email});
}

abstract class AuthRepository {
  Future<LoginResult> login(String email, String password);
  Future<void> register(String email, String password);
}
