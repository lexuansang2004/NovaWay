enum VehicleRole { owner, borrower }

class SelectableVehicle {
  final String id;
  final String type;
  final String licensePlate;
  final String brandModel;
  final VehicleRole role;

  const SelectableVehicle({
    required this.id,
    required this.type,
    required this.licensePlate,
    required this.brandModel,
    required this.role,
  });

  factory SelectableVehicle.fromOwnedJson(Map<String, dynamic> json) {
    return SelectableVehicle(
      id: json['id'] as String,
      type: json['type'] as String,
      licensePlate: json['license_plate'] as String,
      brandModel: json['brand_model'] as String,
      role: VehicleRole.owner,
    );
  }

  factory SelectableVehicle.fromAuthorizationJson(Map<String, dynamic> json) {
    final vehicle = json['vehicle'] as Map<String, dynamic>;
    return SelectableVehicle(
      id: vehicle['id'] as String,
      type: vehicle['type'] as String,
      licensePlate: vehicle['license_plate'] as String,
      brandModel: vehicle['brand_model'] as String,
      role: VehicleRole.borrower,
    );
  }
}
