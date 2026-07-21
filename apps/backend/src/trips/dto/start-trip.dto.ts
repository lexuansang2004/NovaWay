import { IsBoolean, IsUUID } from 'class-validator';

// Matches docs/API_CONTRACT.md §5 POST /trips/start.
export class StartTripDto {
  @IsUUID()
  vehicle_id!: string;

  @IsBoolean()
  consent!: boolean;

  @IsUUID()
  verification_id!: string;
}
