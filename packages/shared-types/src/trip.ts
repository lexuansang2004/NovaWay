// Mirrors DATA_MODEL.md §2.5-2.6 and API_CONTRACT.md §5.
// Hand-maintained by design — see realtime.ts for why. Update alongside
// apps/backend/src/trips/trip.entity.ts and trip.response.ts.

export type TripStatus = 'active' | 'ended';

export interface Trip {
  id: string;
  vehicle_id: string;
  status: TripStatus;
  started_at: string;
  ended_at: string | null;
}

export type VerificationResult = 'success' | 'failed';

export interface BiometricVerification {
  verification_id: string;
  result: VerificationResult;
  error_code?: string;
}
