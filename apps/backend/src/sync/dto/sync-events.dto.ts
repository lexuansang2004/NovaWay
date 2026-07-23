import { IsArray, IsISO8601, IsIn, IsLatitude, IsLongitude, IsNumber, IsUUID, Min } from 'class-validator';

// docs/API_CONTRACT.md §7 POST /trips/sync — envelope only. `events` stays
// unknown[] here (validated manually per-item in SyncService via
// SyncEventItemDto below) instead of @ValidateNested, because the global
// ValidationPipe (whitelist:true, forbidNonWhitelisted:true) would reject
// the WHOLE request on a single malformed event, defeating the documented
// partial_success/failed_events contract (one bad event shouldn't drop the
// other 499 valid ones).
export class SyncEventsDto {
  @IsUUID()
  trip_id!: string;

  @IsArray()
  events!: unknown[];
}

// Per-item shape, matches LocationUpdateDto's field validators
// (apps/backend/src/realtime/dto/location-update.dto.ts) plus the two
// batch-only fields (vehicle_id, source) from docs/API_CONTRACT.md §7.
export class SyncEventItemDto {
  @IsUUID()
  client_event_id!: string;

  @IsUUID()
  vehicle_id!: string;

  @IsISO8601()
  timestamp!: string;

  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  @IsNumber()
  @Min(0)
  speed_kmh!: number;

  @IsNumber()
  accuracy_m!: number;

  // Only value in the gps_source DB enum today (DATA_MODEL.md §2.7) — kept
  // as an explicit field (not hardcoded) so a future source type doesn't
  // require a contract-breaking change.
  @IsIn(['gps'])
  source!: string;
}
