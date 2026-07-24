import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/selectable_vehicle.dart';

void main() {
  group('SelectableVehicle.fromOwnedJson', () {
    test('parses brand_model when present', () {
      final vehicle = SelectableVehicle.fromOwnedJson({
        'id': 'a1111111-1111-4111-8111-111111111111',
        'type': 'motorbike',
        'license_plate': '59A-12345',
        'brand_model': 'Honda SH',
      });

      expect(vehicle.brandModel, 'Honda SH');
      expect(vehicle.role, VehicleRole.owner);
    });

    test('leaves brandModel null when brand_model is null', () {
      final vehicle = SelectableVehicle.fromOwnedJson({
        'id': 'a1111111-1111-4111-8111-111111111111',
        'type': 'motorbike',
        'license_plate': '59A-12345',
        'brand_model': null,
      });

      expect(vehicle.brandModel, isNull);
    });
  });

  group('SelectableVehicle.fromAuthorizationJson', () {
    test('parses brand_model when present', () {
      final vehicle = SelectableVehicle.fromAuthorizationJson({
        'vehicle': {
          'id': 'a1111111-1111-4111-8111-111111111111',
          'type': 'motorbike',
          'license_plate': '59A-12345',
          'brand_model': 'Honda SH',
        },
      });

      expect(vehicle.brandModel, 'Honda SH');
      expect(vehicle.role, VehicleRole.borrower);
    });

    test('leaves brandModel null when brand_model is null', () {
      final vehicle = SelectableVehicle.fromAuthorizationJson({
        'vehicle': {
          'id': 'a1111111-1111-4111-8111-111111111111',
          'type': 'motorbike',
          'license_plate': '59A-12345',
          'brand_model': null,
        },
      });

      expect(vehicle.brandModel, isNull);
    });
  });
}
