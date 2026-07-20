import { Vehicle } from './vehicle.entity';

export function toVehicleResponse(vehicle: Vehicle) {
  return {
    id: vehicle.id,
    type: vehicle.type,
    license_plate: vehicle.licensePlate,
    brand_model: vehicle.brandModel,
    is_active: vehicle.isActive,
  };
}
