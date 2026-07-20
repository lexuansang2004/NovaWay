import { IsISO8601, IsLatitude, IsLongitude, IsNumber, IsUUID, Min } from 'class-validator';

// Matches docs/API_CONTRACT.md §6 client -> server `location:update`.
export class LocationUpdateDto {
  @IsUUID()
  trip_id!: string;

  @IsUUID()
  client_event_id!: string;

  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  @IsNumber()
  @Min(0)
  speed_kmh!: number;

  @IsNumber()
  accuracy_m!: number;

  @IsISO8601()
  timestamp!: string;
}
