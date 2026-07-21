// In-memory only (no shared_preferences yet) — matches the project's
// established "no state management library until genuinely needed"
// restraint (apps/web took the same approach before adding persistence).
// Session does not survive an app restart; step 4.2's acceptance criteria
// don't require that.
class AuthSession {
  static String? token;
  static String? userEmail;

  static bool get isAuthenticated => token != null;

  static void set({required String token, required String userEmail}) {
    AuthSession.token = token;
    AuthSession.userEmail = userEmail;
  }

  static void clear() {
    token = null;
    userEmail = null;
  }
}
