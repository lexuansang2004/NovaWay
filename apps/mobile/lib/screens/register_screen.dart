import 'package:flutter/material.dart';
import '../repositories/api_auth_repository.dart';
import '../repositories/api_exception.dart';
import '../repositories/api_vehicle_repository.dart';
import '../repositories/auth_repository.dart';
import '../repositories/vehicle_repository.dart';
import '../session/auth_session.dart';
import '../theme/app_theme.dart';
import 'vehicle_list_screen.dart';

class RegisterScreen extends StatefulWidget {
  final AuthRepository authRepository;
  final VehicleRepository vehicleRepository;

  const RegisterScreen({
    super.key,
    AuthRepository? authRepository,
    VehicleRepository? vehicleRepository,
  })  : authRepository = authRepository ?? const ApiAuthRepository(),
        vehicleRepository = vehicleRepository ?? const ApiVehicleRepository();

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscurePassword = true;
  bool _submitting = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  String? _validateEmail(String? value) {
    if (value == null || value.trim().isEmpty) return 'Vui lòng nhập email.';
    final emailPattern = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
    if (!emailPattern.hasMatch(value.trim())) return 'Email không hợp lệ.';
    return null;
  }

  String? _validatePassword(String? value) {
    if (value == null || value.isEmpty) return 'Vui lòng nhập mật khẩu.';
    if (value.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.';
    return null;
  }

  String? _validateConfirmPassword(String? value) {
    if (value != _passwordController.text) return 'Mật khẩu nhập lại không khớp.';
    return null;
  }

  Future<void> _handleSubmit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final email = _emailController.text.trim();
    final password = _passwordController.text;

    setState(() {
      _submitting = true;
      _errorMessage = null;
    });

    try {
      await widget.authRepository.register(email, password);
      final result = await widget.authRepository.login(email, password);
      AuthSession.set(token: result.accessToken, userEmail: result.email);
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => VehicleListScreen(vehicleRepository: widget.vehicleRepository),
        ),
      );
    } on ApiException catch (e) {
      setState(() {
        _errorMessage = e.errorCode == 'EMAIL_ALREADY_EXISTS'
            ? 'Email đã được sử dụng.'
            : e.message;
      });
    } catch (_) {
      setState(() {
        _errorMessage = 'Không kết nối được máy chủ. Vui lòng thử lại.';
      });
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(backgroundColor: AppColors.background, elevation: 0),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Tạo tài khoản NovaWay',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 22,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 32),
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    style: const TextStyle(color: AppColors.textPrimary),
                    decoration: const InputDecoration(labelText: 'Email'),
                    validator: _validateEmail,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    style: const TextStyle(color: AppColors.textPrimary),
                    decoration: InputDecoration(
                      labelText: 'Mật khẩu',
                      helperText: 'Tối thiểu 8 ký tự',
                      helperStyle: const TextStyle(color: AppColors.textSecondary),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword ? Icons.visibility_off : Icons.visibility,
                          color: AppColors.textSecondary,
                        ),
                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                      ),
                    ),
                    validator: _validatePassword,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _confirmPasswordController,
                    obscureText: _obscurePassword,
                    style: const TextStyle(color: AppColors.textPrimary),
                    decoration: const InputDecoration(labelText: 'Nhập lại mật khẩu'),
                    validator: _validateConfirmPassword,
                  ),
                  if (_errorMessage != null) ...[
                    const SizedBox(height: 16),
                    Text(
                      _errorMessage!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppColors.error, fontSize: 13),
                    ),
                  ],
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: _submitting ? null : _handleSubmit,
                    child: _submitting
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Đăng ký'),
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Đã có tài khoản? Đăng nhập'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
