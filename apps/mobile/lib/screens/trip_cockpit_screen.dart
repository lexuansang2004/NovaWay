import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:uuid/uuid.dart';
import '../config/api_config.dart';
import '../models/selectable_vehicle.dart';
import '../services/geolocator_location_source.dart';
import '../services/location_source.dart';
import '../services/realtime_client.dart';
import '../services/socket_io_realtime_client.dart';
import '../session/auth_session.dart';
import '../theme/app_theme.dart';

// OQ-006 (docs/01_OPEN_QUESTIONS.md) — chốt ở R1-5 (07/2026): flutter_map +
// OSM public tile, khớp đúng trạng thái HIỆN TẠI của web (Leaflet + OSM
// public tile, docs/ARCHITECTURE.md §5.1) thay vì hướng MapLibre GL JS
// tương lai (TDR-002) — tránh phụ thuộc vào OQ-005 (tile provider) vẫn
// đang mở. Đổi sang maplibre_gl sau, song song với web, khi OQ-005 chốt.
const _osmTileUrlTemplate = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const _defaultCenter = LatLng(10.7769, 106.7009); // Hồ Chí Minh City

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
  final TileProvider tileProvider;

  TripCockpitScreen({
    super.key,
    required this.vehicle,
    this.tripId = ApiConfig.debugTripId,
    LocationSource? locationSource,
    RealtimeClient? realtimeClient,
    TileProvider? tileProvider,
  })  : locationSource = locationSource ?? GeolocatorLocationSource(),
        realtimeClient = realtimeClient ?? SocketIoRealtimeClient(),
        // Widget tests inject a fake (see test/fakes/fake_tile_provider.dart)
        // so they never hit the real network for map tiles.
        tileProvider = tileProvider ?? NetworkTileProvider();

  @override
  State<TripCockpitScreen> createState() => _TripCockpitScreenState();
}

class _TripCockpitScreenState extends State<TripCockpitScreen> {
  static const _uuid = Uuid();

  static const _maxTrailPoints = 500;

  final MapController _mapController = MapController();

  _Phase _phase = _Phase.idle;
  String? _message;
  LocationFix? _lastFix;
  final List<LatLng> _trail = [];
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
    _mapController.dispose();
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
      final point = LatLng(fix.latitude, fix.longitude);
      setState(() {
        _lastFix = fix;
        _trail.add(point);
        if (_trail.length > _maxTrailPoints) {
          _trail.removeAt(0);
        }
      });
      _mapController.move(point, _mapController.camera.zoom);
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
      _trail.clear();
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
        child: Column(
          children: [
            Expanded(
              child: FlutterMap(
                mapController: _mapController,
                options: MapOptions(
                  initialCenter: _lastFix != null
                      ? LatLng(_lastFix!.latitude, _lastFix!.longitude)
                      : _defaultCenter,
                  initialZoom: 16,
                ),
                children: [
                  TileLayer(
                    urlTemplate: _osmTileUrlTemplate,
                    userAgentPackageName: 'vn.novaway.mobile',
                    tileProvider: widget.tileProvider,
                  ),
                  if (_trail.length > 1)
                    PolylineLayer(
                      polylines: [Polyline(points: _trail, color: AppColors.cyan, strokeWidth: 4)],
                    ),
                  if (_lastFix != null)
                    MarkerLayer(
                      markers: [
                        Marker(
                          point: LatLng(_lastFix!.latitude, _lastFix!.longitude),
                          width: 40,
                          height: 40,
                          child: const Icon(
                            Icons.navigation,
                            key: Key('trip-position-marker'),
                            color: AppColors.cyan,
                            size: 32,
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
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
          ],
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
