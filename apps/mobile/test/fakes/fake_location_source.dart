import 'dart:async';
import 'package:mobile/services/location_source.dart';

class FakeLocationSource implements LocationSource {
  final LocationPermissionResult permissionResult;
  final _controller = StreamController<LocationFix>.broadcast();

  FakeLocationSource({this.permissionResult = LocationPermissionResult.granted});

  @override
  Future<LocationPermissionResult> requestPermission() async => permissionResult;

  @override
  Stream<LocationFix> positionStream() => _controller.stream;

  void emit(LocationFix fix) => _controller.add(fix);
}
