import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsUUID, ValidateNested } from 'class-validator';

// Matches docs/API_CONTRACT.md §10 POST /api/routes/preview.
export class LatLngDto {
  @IsLatitude()
  lat!: number;

  @IsLongitude()
  lng!: number;
}

export class RoutePreviewDto {
  @IsUUID()
  vehicle_id!: string;

  @ValidateNested()
  @Type(() => LatLngDto)
  origin!: LatLngDto;

  @ValidateNested()
  @Type(() => LatLngDto)
  destination!: LatLngDto;
}
