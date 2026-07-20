import '../models/selectable_vehicle.dart';

abstract class VehicleRepository {
  /// Owned vehicles + vehicles the current user has an active borrow
  /// authorization for (docs/API_CONTRACT.md §2 + §3 `/authorizations/me`).
  Future<List<SelectableVehicle>> fetchSelectableVehicles();
}
