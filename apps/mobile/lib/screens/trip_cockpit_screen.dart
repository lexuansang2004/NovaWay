import 'dart:async';
import 'package:flutter/material.dart';
import 'package:maplibre_gl/maplibre_gl.dart';
import 'package:uuid/uuid.dart';
import '../config/api_config.dart';
import '../models/selectable_vehicle.dart';
import '../services/geolocator_location_source.dart';
import '../services/location_source.dart';
import '../services/realtime_client.dart';
import '../services/socket_io_realtime_client.dart';
import '../session/auth_session.dart';
import '../theme/app_theme.dart';

// R2-4 (docs/roadmap/SPRINT_R2_PRODUCT_COMPLETION.md) — flutter_map ->
// maplibre_gl + Protomaps, song song với web's TripMap.tsx migration (R2-3).
// OQ-006 (docs/01_OPEN_QUESTIONS.md) ban đầu chốt flutter_map ở R1-5 để khớp
// trạng thái web LÚC ĐÓ (Leaflet + OSM public tile); giờ web đã đổi sang
// MapLibre GL JS + Protomaps nên mobile đổi theo, dùng cùng style "dark".
//
// QUAN TRỌNG — khác biệt kiến trúc so với flutter_map: maplibre_gl render
// qua native platform view (AndroidView/UiKitView/WebView), không phải cây
// widget Flutter thuần. Vì vậy:
//   1. Không có khái niệm "tile provider" ở tầng Dart để fake trong test —
//      NetworkTileProvider/FakeTileProvider (flutter_map) không có tương
//      đương, đã bỏ khỏi widget này hoàn toàn.
//   2. Marker/trail không còn là widget khai báo (Marker/PolylineLayer) mà
//      là annotation mệnh lệnh qua MapLibreMapController (addCircle/addLine),
//      chỉ tạo được sau khi controller sẵn sàng (onMapCreated) — xem
//      _updateMapAnnotations.
//   3. maplibre_gl chỉ hỗ trợ Android/iOS/Web (không có Windows) — verify
//      trực quan thật không còn dùng `flutter build windows --debug` được
//      nữa (khác R1-5), chuyển sang `flutter run -d chrome` vì maplibre_gl
//      hỗ trợ web qua maplibre_gl_web. Chi tiết:
//      docs/roadmap/OPEN_ITEMS_AFTER_MVP.md §7.
final String _mapStyle = 'https://api.protomaps.com/styles/v5/dark/en.json?key=${ApiConfig.protomapsApiKey}';
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

  static const _maxTrailPoints = 500;

  MapLibreMapController? _mapController;
  Circle? _positionMarker;
  Line? _trailLine;

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
    // _mapController is owned/disposed by the MapLibreMap widget itself
    // (provided via onMapCreated, not constructed by us) — no explicit
    // dispose call here, unlike flutter_map's self-owned MapController.
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
          // Reconnects (e.g. after a network blip) re-emit `connected`
          // without necessarily passing through `disconnected` first —
          // cancel any existing subscription before starting a new one, or
          // multiple parallel position streams stack up and interleave
          // out-of-order points into `_trail`, drawing a jumbled zigzag.
          _positionSub?.cancel();
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
      unawaited(_updateMapAnnotations(point));
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

  // Marker/trail are imperative map annotations (not declarative widgets)
  // with maplibre_gl — create once, then update in place on every fix.
  Future<void> _updateMapAnnotations(LatLng point) async {
    final controller = _mapController;
    if (controller == null) return;

    if (_positionMarker == null) {
      _positionMarker = await controller.addCircle(
        CircleOptions(
          geometry: point,
          circleRadius: 10,
          circleColor: '#0f172a',
          circleStrokeColor: '#22d3ee',
          circleStrokeWidth: 3,
        ),
      );
    } else {
      await controller.updateCircle(_positionMarker!, CircleOptions(geometry: point));
    }

    if (_trailLine == null) {
      _trailLine = await controller.addLine(
        LineOptions(geometry: List.of(_trail), lineColor: '#22d3ee', lineWidth: 4, lineOpacity: 0.8),
      );
    } else {
      await controller.updateLine(_trailLine!, LineOptions(geometry: List.of(_trail)));
    }
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
              child: MapLibreMap(
                key: const Key('trip-map'),
                styleString: _mapStyle,
                initialCameraPosition: CameraPosition(
                  target: _lastFix != null ? LatLng(_lastFix!.latitude, _lastFix!.longitude) : _defaultCenter,
                  zoom: 16,
                ),
                onMapCreated: (controller) => _mapController = controller,
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
