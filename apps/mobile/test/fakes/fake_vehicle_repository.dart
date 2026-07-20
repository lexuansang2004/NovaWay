import 'package:mobile/models/selectable_vehicle.dart';
import 'package:mobile/repositories/vehicle_repository.dart';

class FakeVehicleRepository implements VehicleRepository {
  final List<SelectableVehicle> vehicles;

  const FakeVehicleRepository(this.vehicles);

  @override
  Future<List<SelectableVehicle>> fetchSelectableVehicles() async => vehicles;
}
