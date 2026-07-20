import { VehicleAuthorization } from './vehicle-authorization.entity';
import { deriveEffectiveStatus } from './authorization-status';

export function toAuthorizationResponse(auth: VehicleAuthorization) {
  return {
    id: auth.id,
    vehicle_id: auth.vehicleId,
    owner_id: auth.ownerId,
    borrower_id: auth.borrowerId,
    granted_at: auth.grantedAt.toISOString(),
    expires_at: auth.expiresAt.toISOString(),
    status: deriveEffectiveStatus(auth),
  };
}
