import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { VehicleType } from '../vehicle.entity';

export class CreateVehicleDto {
  @IsIn(['motorbike', 'car'])
  type!: VehicleType;

  @IsString()
  @MaxLength(20)
  license_plate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand_model?: string;
}
