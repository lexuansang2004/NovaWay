import 'package:flutter/material.dart';
import '../models/selectable_vehicle.dart';
import '../repositories/api_exception.dart';
import '../repositories/api_vehicle_repository.dart';
import '../repositories/vehicle_repository.dart';
import '../session/auth_session.dart';
import '../theme/app_theme.dart';
import 'home_screen.dart';

class VehicleListScreen extends StatefulWidget {
  final VehicleRepository vehicleRepository;

  const VehicleListScreen({super.key, VehicleRepository? vehicleRepository})
      : vehicleRepository = vehicleRepository ?? const ApiVehicleRepository();

  @override
  State<VehicleListScreen> createState() => _VehicleListScreenState();
}

enum _LoadState { loading, loaded, error }

class _VehicleListScreenState extends State<VehicleListScreen> {
  _LoadState _state = _LoadState.loading;
  List<SelectableVehicle> _vehicles = [];
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _state = _LoadState.loading);
    try {
      final vehicles = await widget.vehicleRepository.fetchSelectableVehicles();
      setState(() {
        _vehicles = vehicles;
        _state = _LoadState.loaded;
      });
    } on ApiException catch (e) {
      setState(() {
        _errorMessage = e.message;
        _state = _LoadState.error;
      });
    } catch (_) {
      setState(() {
        _errorMessage = 'Không kết nối được máy chủ. Vui lòng thử lại.';
        _state = _LoadState.error;
      });
    }
  }

  void _selectVehicle(SelectableVehicle vehicle) {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => HomeScreen(vehicle: vehicle)),
    );
  }

  void _logout() {
    AuthSession.clear();
    Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text('Chọn phương tiện'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: AppColors.textSecondary),
            onPressed: _logout,
          ),
        ],
      ),
      body: SafeArea(child: _buildBody()),
    );
  }

  Widget _buildBody() {
    switch (_state) {
      case _LoadState.loading:
        return const Center(child: CircularProgressIndicator(color: AppColors.cyan));
      case _LoadState.error:
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, color: AppColors.error, size: 40),
                const SizedBox(height: 12),
                Text(
                  _errorMessage ?? 'Đã có lỗi xảy ra.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.textSecondary),
                ),
                const SizedBox(height: 16),
                ElevatedButton(onPressed: _load, child: const Text('Thử lại')),
              ],
            ),
          ),
        );
      case _LoadState.loaded:
        if (_vehicles.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: const [
                  Icon(Icons.directions_car_filled_outlined, color: AppColors.textSecondary, size: 40),
                  SizedBox(height: 12),
                  Text(
                    'Bạn chưa có phương tiện nào.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.textPrimary, fontSize: 16),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Cần có xe sở hữu hoặc được uỷ quyền để bắt đầu chuyến đi.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                  ),
                ],
              ),
            ),
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: _vehicles.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (context, index) {
            final vehicle = _vehicles[index];
            final roleLabel = vehicle.role == VehicleRole.owner ? 'Xe của bạn' : 'Được uỷ quyền';
            return InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: () => _selectVehicle(vehicle),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.two_wheeler, color: AppColors.cyan),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            vehicle.licensePlate,
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            '${vehicle.brandModel} · $roleLabel',
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right, color: AppColors.textSecondary),
                  ],
                ),
              ),
            );
          },
        );
    }
  }
}
