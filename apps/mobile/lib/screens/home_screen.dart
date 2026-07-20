import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

// Placeholder post-login landing for step 4.1. Vehicle list / selection
// (docs/ARCHITECTURE.md §5.1: Login -> Vehicle List -> Biometric Verify ->
// Trip Cockpit) is step 4.2.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
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
              Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
            },
          ),
        ],
      ),
      body: const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.check_circle, color: AppColors.emerald, size: 40),
              SizedBox(height: 12),
              Text(
                'Sẵn sàng cho hành trình thông minh tiếp theo.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textPrimary, fontSize: 16),
              ),
              SizedBox(height: 8),
              Text(
                'Quản lý phương tiện và bắt đầu chuyến đi sẽ có ở bước triển khai tiếp theo.',
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
