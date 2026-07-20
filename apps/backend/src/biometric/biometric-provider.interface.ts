export interface BiometricVerifyResult {
  result: 'success' | 'failed';
  errorCode?: string;
}

// ARCHITECTURE.md §3.2 adapter pattern — business logic (BiometricService)
// depends on this interface, never a concrete SDK, so the MVP mock can be
// swapped for a real third-party provider later without touching callers.
export interface BiometricProvider {
  readonly providerName: string;
  verify(userId: string, vehicleId: string, payload: string): Promise<BiometricVerifyResult>;
}

export const BIOMETRIC_PROVIDER = Symbol('BIOMETRIC_PROVIDER');
