import 'package:geolocator/geolocator.dart';
import 'location_source.dart';

class GeolocatorLocationSource implements LocationSource {
  @override
  Future<LocationPermissionResult> requestPermission() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return LocationPermissionResult.serviceDisabled;

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
      return LocationPermissionResult.denied;
    }
    return LocationPermissionResult.granted;
  }

  @override
  Stream<LocationFix> positionStream() {
    return Geolocator.getPositionStream(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 5),
    ).map(
      (p) => LocationFix(
        latitude: p.latitude,
        longitude: p.longitude,
        speedKmh: p.speed * 3.6,
        accuracyM: p.accuracy,
      ),
    );
  }
}
