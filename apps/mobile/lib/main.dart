import 'package:flutter/material.dart';
import 'repositories/api_auth_repository.dart';
import 'repositories/api_vehicle_repository.dart';
import 'repositories/auth_repository.dart';
import 'repositories/vehicle_repository.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const NovaWayApp());
}

class NovaWayApp extends StatelessWidget {
  final AuthRepository authRepository;
  final VehicleRepository vehicleRepository;

  const NovaWayApp({
    super.key,
    this.authRepository = const ApiAuthRepository(),
    this.vehicleRepository = const ApiVehicleRepository(),
  });

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'NovaWay',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      initialRoute: '/',
      routes: {
        '/': (context) => const SplashScreen(),
        '/login': (context) => LoginScreen(
              authRepository: authRepository,
              vehicleRepository: vehicleRepository,
            ),
        '/register': (context) => RegisterScreen(
              authRepository: authRepository,
              vehicleRepository: vehicleRepository,
            ),
      },
    );
  }
}
