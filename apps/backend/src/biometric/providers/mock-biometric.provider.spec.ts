import { MockBiometricProvider } from './mock-biometric.provider';

describe('MockBiometricProvider', () => {
  function buildProvider() {
    return new MockBiometricProvider();
  }

  it('exposes its provider name', () => {
    expect(buildProvider().providerName).toBe('mock');
  });

  describe('createSession', () => {
    it('returns a random, non-empty session id', async () => {
      const provider = buildProvider();
      const a = await provider.createSession();
      const b = await provider.createSession();

      expect(a.sessionId).toEqual(expect.any(String));
      expect(a.sessionId.length).toBeGreaterThan(0);
      expect(a.sessionId).not.toBe(b.sessionId);
    });
  });

  describe('verify', () => {
    it('succeeds for any session id other than the "fail" test hook', async () => {
      const provider = buildProvider();
      const { sessionId } = await provider.createSession();

      const result = await provider.verify('user-id', 'vehicle-id', sessionId);

      expect(result).toEqual({ result: 'success' });
    });

    it('fails with FACE_NOT_MATCHED when sessionId is the literal "fail" test hook', async () => {
      const provider = buildProvider();

      const result = await provider.verify('user-id', 'vehicle-id', 'fail');

      expect(result).toEqual({ result: 'failed', errorCode: 'FACE_NOT_MATCHED' });
    });
  });
});
