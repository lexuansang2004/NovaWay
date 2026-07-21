import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { VehicleType } from '../vehicle.entity';

// docs/API_CONTRACT.md §2 PATCH /api/vehicles/:id — any subset of vehicle
// fields except id/user_id. is_active is intentionally excluded: it has its
// own dedicated /activate endpoint that enforces the single-active-vehicle
// invariant transactionally.
export class UpdateVehicleDto {
  @IsOptional()
  @IsIn(['motorbike', 'car'])
  type?: VehicleType;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  license_plate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand_model?: string;
}
