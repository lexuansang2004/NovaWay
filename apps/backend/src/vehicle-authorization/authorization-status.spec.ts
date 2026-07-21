import { deriveEffectiveStatus } from './authorization-status';
import { VehicleAuthorization } from './vehicle-authorization.entity';

const buildAuth = (overrides: Partial<VehicleAuthorization>): VehicleAuthorization => ({
  id: 'auth-id',
  vehicleId: 'vehicle-id',
  ownerId: 'owner-id',
  borrowerId: 'borrower-id',
  grantedAt: new Date('2026-07-18T00:00:00.000Z'),
  expiresAt: new Date('2026-07-19T00:00:00.000Z'),
  revokedAt: null,
  status: 'active',
  ...overrides,
});

describe('deriveEffectiveStatus', () => {
  it('returns revoked when the stored status is revoked, regardless of expiry', () => {
    const auth = buildAuth({ status: 'revoked', expiresAt: new Date(Date.now() + 100000) });
    expect(deriveEffectiveStatus(auth)).toBe('revoked');
  });

  it('returns expired when expires_at is in the past', () => {
    const auth = buildAuth({ status: 'active', expiresAt: new Date(Date.now() - 1000) });
    expect(deriveEffectiveStatus(auth)).toBe('expired');
  });

  it('returns active when expires_at is in the future and not revoked', () => {
    const auth = buildAuth({ status: 'active', expiresAt: new Date(Date.now() + 100000) });
    expect(deriveEffectiveStatus(auth)).toBe('active');
  });
});
