export interface BiometricVerifyResult {
  result: 'success' | 'failed';
  errorCode?: string;
  // Only AwsRekognitionBiometricProvider sets this (Face Liveness confidence
  // score, 0-100) — surfaced for observability, never used by the mock.
  confidence?: number;
}

// ARCHITECTURE.md §3.2 adapter pattern — business logic (BiometricService)
// depends on this interface, never a concrete SDK, so the MVP mock can be
// swapped for a real third-party provider later without touching callers.
//
// R2-6 (docs/architecture/TDR-biometric-provider-spike.md) — AWS Rekognition
// Face Liveness is session-based, not a single "verify this payload" call:
// the client must first obtain a SessionId, then use AWS's own client SDK to
// stream the liveness capture directly to AWS (never through this backend),
// and only then can verify() ask AWS for that session's result. createSession
// exists so BiometricService can gate session creation behind the same
// owner/authorization check as verify() — an AWS Face Liveness session is a
// billed operation, so a stranger must never be able to trigger one.
export interface BiometricProvider {
  readonly providerName: string;
  createSession(): Promise<{ sessionId: string }>;
  verify(userId: string, vehicleId: string, sessionId: string): Promise<BiometricVerifyResult>;
}

export const BIOMETRIC_PROVIDER = Symbol('BIOMETRIC_PROVIDER');
