import 'package:flutter/material.dart';
import '../models/selectable_vehicle.dart';
import '../session/auth_session.dart';
import '../theme/app_theme.dart';

// Post-vehicle-selection placeholder for step 4.2. Biometric verify + Trip
// Cockpit (docs/ARCHITECTURE.md §5.1: Login -> Vehicle List -> Biometric
// Verify -> Trip Cockpit) need a real trip_id, which only exists once
// step 7.1's Trip Logs API lands — deferred there, same reasoning as web's
// mock GPS sender in step 3.2.
class HomeScreen extends StatelessWidget {
  final SelectableVehicle vehicle;

  const HomeScreen({super.key, required this.vehicle});

  @override
  Widget build(BuildContext context) {
    final roleLabel = vehicle.role == VehicleRole.owner ? 'Xe của bạn' : 'Xe được uỷ quyền';
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text('NovaWay'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: AppColors.textSecondary),
            onPressed: () {
              AuthSession.clear();
              Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
            },
          ),
        ],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.check_circle, color: AppColors.emerald, size: 40),
              const SizedBox(height: 12),
              Text(
                'Sẵn sàng cho hành trình thông minh tiếp theo.',
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.textPrimary, fontSize: 16),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  children: [
                    Text(
                      vehicle.licensePlate,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      vehicle.brandModel,
                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      roleLabel,
                      style: const TextStyle(color: AppColors.cyan, fontSize: 12),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Xác thực khuôn mặt và bắt đầu chuyến đi sẽ có ở bước triển khai tiếp theo.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
