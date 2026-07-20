import { VehicleAuthorization } from './vehicle-authorization.entity';

export type EffectiveAuthorizationStatus = 'active' | 'expired' | 'revoked';

// The DB column only ever holds 'active' or 'revoked' (set explicitly by the
// app); 'expired' is derived here from expires_at rather than written back,
// so it's always accurate without a background job flipping the column.
export function deriveEffectiveStatus(auth: VehicleAuthorization): EffectiveAuthorizationStatus {
  if (auth.status === 'revoked') {
    return 'revoked';
  }
  return auth.expiresAt.getTime() <= Date.now() ? 'expired' : 'active';
}
