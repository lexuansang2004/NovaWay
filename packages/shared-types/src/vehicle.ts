// Mirrors DATA_MODEL.md §2.2 `vehicles.type` and §2.3 `vehicle_authorizations`.
// Hand-maintained by design — see realtime.ts for why. Update alongside
// apps/backend/src/vehicles/vehicle.entity.ts.

export type VehicleType = 'motorbike' | 'car';

export interface Vehicle {
  id: string;
  type: VehicleType;
  license_plate: string;
  brand_model?: string;
  is_active: boolean;
}

export type AuthorizationStatus = 'active' | 'expired' | 'revoked';

export interface VehicleAuthorization {
  id: string;
  vehicle_id: string;
  owner_id: string;
  borrower_id: string;
  granted_at: string;
  expires_at: string;
  revoked_at: string | null;
  status: AuthorizationStatus;
}
