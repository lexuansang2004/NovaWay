import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator_platform_interface/geolocator_platform_interface.dart';
import 'package:mobile/services/geolocator_location_source.dart';
import 'package:mobile/services/location_source.dart';

// Fakes the plugin's platform boundary (the federated-plugin pattern's own
// supported test seam — GeolocatorPlatform.instance is swappable), not the
// LocationSource interface itself, so the real GeolocatorLocationSource
// class under test (branching/mapping logic) actually runs.
class _FakeGeolocatorPlatform extends GeolocatorPlatform {
  bool serviceEnabled = true;
  LocationPermission checkResult = LocationPermission.always;
  LocationPermission requestResult = LocationPermission.always;
  bool requestPermissionCalled = false;
  final _positionController = StreamController<Position>.broadcast();

  @override
  Future<bool> isLocationServiceEnabled() async => serviceEnabled;

  @override
  Future<LocationPermission> checkPermission() async => checkResult;

  @override
  Future<LocationPermission> requestPermission() async {
    requestPermissionCalled = true;
    return requestResult;
  }

  @override
  Stream<Position> getPositionStream({LocationSettings? locationSettings}) {
    return _positionController.stream;
  }

  void emitPosition(Position position) => _positionController.add(position);
}

Position _buildPosition({
  required double latitude,
  required double longitude,
  required double speed,
  required double accuracy,
}) {
  return Position(
    latitude: latitude,
    longitude: longitude,
    timestamp: DateTime.utc(2026, 1, 1),
    accuracy: accuracy,
    altitude: 0,
    altitudeAccuracy: 0,
    heading: 0,
    headingAccuracy: 0,
    speed: speed,
    speedAccuracy: 0,
  );
}

void main() {
  late _FakeGeolocatorPlatform fakePlatform;
  late GeolocatorLocationSource source;

  setUp(() {
    fakePlatform = _FakeGeolocatorPlatform();
    GeolocatorPlatform.instance = fakePlatform;
    source = GeolocatorLocationSource();
  });

  group('requestPermission', () {
    test('returns serviceDisabled without checking permission when location services are off', () async {
      fakePlatform.serviceEnabled = false;

      final result = await source.requestPermission();

      expect(result, LocationPermissionResult.serviceDisabled);
      expect(fakePlatform.requestPermissionCalled, isFalse);
    });

    test('returns granted directly when permission is already granted, without prompting', () async {
      fakePlatform.checkResult = LocationPermission.whileInUse;

      final result = await source.requestPermission();

      expect(result, LocationPermissionResult.granted);
      expect(fakePlatform.requestPermissionCalled, isFalse);
    });

    test('prompts via requestPermission() when the initial check is denied, and returns granted on approval', () async {
      fakePlatform.checkResult = LocationPermission.denied;
      fakePlatform.requestResult = LocationPermission.whileInUse;

      final result = await source.requestPermission();

      expect(result, LocationPermissionResult.granted);
      expect(fakePlatform.requestPermissionCalled, isTrue);
    });

    test('returns denied when the user declines the prompt', () async {
      fakePlatform.checkResult = LocationPermission.denied;
      fakePlatform.requestResult = LocationPermission.denied;

      final result = await source.requestPermission();

      expect(result, LocationPermissionResult.denied);
    });

    test('returns denied when permission is permanently denied', () async {
      fakePlatform.checkResult = LocationPermission.deniedForever;

      final result = await source.requestPermission();

      expect(result, LocationPermissionResult.denied);
      expect(fakePlatform.requestPermissionCalled, isFalse);
    });
  });

  group('positionStream', () {
    test('maps Position fields to LocationFix, converting speed from m/s to km/h', () async {
      final fixes = <LocationFix>[];
      final subscription = source.positionStream().listen(fixes.add);

      fakePlatform.emitPosition(
        _buildPosition(latitude: 10.77, longitude: 106.7, speed: 10, accuracy: 5),
      );
      await Future<void>.delayed(Duration.zero);

      expect(fixes, hasLength(1));
      expect(fixes.single.latitude, 10.77);
      expect(fixes.single.longitude, 106.7);
      expect(fixes.single.speedKmh, closeTo(36, 0.001));
      expect(fixes.single.accuracyM, 5);

      await subscription.cancel();
    });
  });
}
