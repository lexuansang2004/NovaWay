enum LocationPermissionResult { granted, denied, serviceDisabled }

class LocationFix {
  final double latitude;
  final double longitude;
  final double speedKmh;
  final double accuracyM;

  const LocationFix({
    required this.latitude,
    required this.longitude,
    required this.speedKmh,
    required this.accuracyM,
  });
}

abstract class LocationSource {
  Future<LocationPermissionResult> requestPermission();
  Stream<LocationFix> positionStream();
}
