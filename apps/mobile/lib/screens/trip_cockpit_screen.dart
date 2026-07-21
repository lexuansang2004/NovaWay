import 'dart:async';
import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../config/api_config.dart';
import '../models/selectable_vehicle.dart';
import '../services/geolocator_location_source.dart';
import '../services/location_source.dart';
import '../services/realtime_client.dart';
import '../services/socket_io_realtime_client.dart';
import '../session/auth_session.dart';
import '../theme/app_theme.dart';

enum _Phase {
  idle,
  checkingPermission,
  permissionDenied,
  serviceDisabled,
  tripUnavailable,
  connecting,
  tracking,
}

class TripCockpitScreen extends StatefulWidget {
  final SelectableVehicle vehicle;
  final String tripId;
  final LocationSource locationSource;
  final RealtimeClient realtimeClient;

  TripCockpitScreen({
    super.key,
    required this.vehicle,
    this.tripId = ApiConfig.debugTripId,
    LocationSource? locationSource,
    RealtimeClient? realtimeClient,
  })  : locationSource = locationSource ?? GeolocatorLocationSource(),
        realtimeClient = realtimeClient ?? SocketIoRealtimeClient();

  @override
  State<TripCockpitScreen> createState() => _TripCockpitScreenState();
}

class _TripCockpitScreenState extends State<TripCockpitScreen> {
  static const _uuid = Uuid();

  _Phase _phase = _Phase.idle;
  String? _message;
  LocationFix? _lastFix;
  StreamSubscription<LocationFix>? _positionSub;
  StreamSubscription<RealtimeConnectionState>? _connectionSub;
  StreamSubscription<String>? _rejectionSub;

  @override
  void initState() {
    super.initState();
    _connectionSub = widget.realtimeClient.connectionState.listen(_onConnectionState);
    _rejectionSub = widget.realtimeClient.rejections.listen(_onRejection);
  }

  @override
  void dispose() {
    _positionSub?.cancel();
    _connectionSub?.cancel();
    _rejectionSub?.cancel();
    widget.realtimeClient.disconnect();
    super.dispose();
  }

  void _onConnectionState(RealtimeConnectionState state) {
    if (!mounted) return;
    setState(() {
      switch (state) {
        case RealtimeConnectionState.connecting:
          _phase = _Phase.connecting;
        case RealtimeConnectionState.connected:
          _phase = _Phase.tracking;
          _startPositionStream();
        case RealtimeConnectionState.disconnected:
          if (_phase == _Phase.tracking || _phase == _Phase.connecting) {
            _phase = _Phase.idle;
            _message = 'Mất kết nối tới máy chủ.';
          }
          _positionSub?.cancel();
          _positionSub = null;
        case RealtimeConnectionState.rejected:
          _phase = _Phase.idle;
          _message = 'Kết nối bị từ chối. Vui lòng đăng nhập lại.';
      }
    });
  }

  void _onRejection(String errorCode) {
    if (!mounted) return;
    setState(() => _message = 'Vị trí bị từ chối: $errorCode');
  }

  void _startPositionStream() {
    _positionSub = widget.locationSource.positionStream().listen((fix) {
      if (!mounted) return;
      setState(() => _lastFix = fix);
      widget.realtimeClient.sendLocation(
        LocationUpdatePayload(
          tripId: widget.tripId,
          clientEventId: _uuid.v4(),
          latitude: fix.latitude,
          longitude: fix.longitude,
          speedKmh: fix.speedKmh,
          accuracyM: fix.accuracyM,
          timestamp: DateTime.now().toUtc().toIso8601String(),
        ),
      );
    });
  }

  Future<void> _handleStart() async {
    if (widget.tripId.isEmpty) {
      setState(() {
        _phase = _Phase.tripUnavailable;
        _message = 'Trip API chưa sẵn sàng (sẽ bổ sung ở bước 7.1).';
      });
      return;
    }

    setState(() {
      _phase = _Phase.checkingPermission;
      _message = null;
    });

    final result = await widget.locationSource.requestPermission();
    if (!mounted) return;

    switch (result) {
      case LocationPermissionResult.denied:
        setState(() {
          _phase = _Phase.permissionDenied;
          _message = 'Cần quyền truy cập vị trí để bắt đầu chuyến đi.';
        });
        return;
      case LocationPermissionResult.serviceDisabled:
        setState(() {
          _phase = _Phase.serviceDisabled;
          _message = 'Vui lòng bật dịch vụ định vị (GPS).';
        });
        return;
      case LocationPermissionResult.granted:
        break;
    }

    final token = AuthSession.token;
    if (token == null) return;
    widget.realtimeClient.connect(token);
  }

  void _handleStop() {
    _positionSub?.cancel();
    _positionSub = null;
    widget.realtimeClient.disconnect();
    setState(() {
      _phase = _Phase.idle;
      _message = null;
      _lastFix = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isTracking = _phase == _Phase.tracking || _phase == _Phase.connecting;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Text(widget.vehicle.licensePlate),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                isTracking ? Icons.gps_fixed : Icons.gps_not_fixed,
                color: isTracking ? AppColors.emerald : AppColors.textSecondary,
                size: 48,
              ),
              const SizedBox(height: 16),
              Text(_statusLabel(), style: const TextStyle(color: AppColors.textPrimary, fontSize: 16)),
              if (_message != null) ...[
                const SizedBox(height: 8),
                Text(
                  _message!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                ),
              ],
              if (_lastFix != null) ...[
                const SizedBox(height: 16),
                Text(
                  '${_lastFix!.speedKmh.toStringAsFixed(1)} km/h',
                  style: const TextStyle(color: AppColors.cyan, fontSize: 28, fontWeight: FontWeight.w600),
                ),
              ],
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: isTracking ? _handleStop : _handleStart,
                child: Text(isTracking ? 'Dừng' : 'Bắt đầu'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _statusLabel() {
    switch (_phase) {
      case _Phase.idle:
        return 'Sẵn sàng bắt đầu';
      case _Phase.checkingPermission:
        return 'Đang kiểm tra quyền vị trí...';
      case _Phase.permissionDenied:
        return 'Chưa có quyền vị trí';
      case _Phase.serviceDisabled:
        return 'Dịch vụ định vị đang tắt';
      case _Phase.tripUnavailable:
        return 'Chưa thể bắt đầu chuyến đi';
      case _Phase.connecting:
        return 'Đang kết nối...';
      case _Phase.tracking:
        return 'Đang theo dõi vị trí';
    }
  }
}
