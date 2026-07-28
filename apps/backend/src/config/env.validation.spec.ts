import { envValidationSchema } from './env.validation';

// R5-8 (docs/roadmap/SPRINT_R5_DEPENDENCY_AND_COVERAGE.md). This schema is
// the boot gate: ConfigModule.forRoot({ validationSchema }) in app.module.ts
// throws synchronously from Joi's validation error if it fails, crashing
// startup rather than letting the app run on a config it can't trust. A
// regression here either lets a broken config through — silent misbehavior
// in production — or blocks a valid one — an outage nobody can explain from
// the app's own logs.
//
// Validated with the same options @nestjs/config actually applies
// (config.module.js: `{ abortEarly: false, allowUnknown: true }`), not just
// Joi's bare defaults — otherwise these tests would assert a validator that
// doesn't match what runs at boot.
const VALIDATION_OPTIONS = { abortEarly: false, allowUnknown: true };

function validate(env: Record<string, string | undefined>) {
  return envValidationSchema.validate(env, VALIDATION_OPTIONS);
}

const MINIMAL_VALID_ENV = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/novaway',
  JWT_SECRET: 'a-secret-at-least-16-chars',
};

describe('envValidationSchema', () => {
  it('accepts a minimal env and fills in every documented default', () => {
    const { error, value } = validate(MINIMAL_VALID_ENV);

    expect(error).toBeUndefined();
    expect(value).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      JWT_EXPIRES_IN: '7d',
      WEB_ORIGIN: 'http://localhost:5173',
      ROUTING_PROVIDER: 'mock',
      ROUTING_ENGINE_TIMEOUT_MS: 3000,
      VERIFICATION_VALIDITY_MINUTES: 5,
      BIOMETRIC_PROVIDER: 'mock',
      AWS_REGION: 'us-east-1',
      AWS_REKOGNITION_LIVENESS_MIN_CONFIDENCE: 90,
    });
  });

  it('passes through real, unrelated process.env variables unharmed', () => {
    // allowUnknown: true is what makes this schema usable at all — PATH,
    // HOME, npm_* etc. are present in every real process.env. If this ever
    // regressed, the app would fail to boot on every machine, not just in CI.
    const { error } = validate({ ...MINIMAL_VALID_ENV, PATH: '/usr/bin', HOME: '/root' });

    expect(error).toBeUndefined();
  });

  it('rejects a missing DATABASE_URL', () => {
    const { error } = validate({ JWT_SECRET: MINIMAL_VALID_ENV.JWT_SECRET });

    expect(error?.message).toContain('DATABASE_URL');
  });

  it('rejects a DATABASE_URL with the wrong scheme', () => {
    // Guards against the realistic copy-paste mistake of pointing this at a
    // different database engine's connection string.
    const { error } = validate({
      ...MINIMAL_VALID_ENV,
      DATABASE_URL: 'mysql://user:pass@localhost:3306/novaway',
    });

    expect(error?.message).toContain('DATABASE_URL');
  });

  it('rejects a missing JWT_SECRET', () => {
    const { error } = validate({ DATABASE_URL: MINIMAL_VALID_ENV.DATABASE_URL });

    expect(error?.message).toContain('JWT_SECRET');
  });

  it('rejects a JWT_SECRET shorter than 16 characters', () => {
    // The floor that keeps someone from ever shipping JWT_SECRET=changeme.
    const { error } = validate({ ...MINIMAL_VALID_ENV, JWT_SECRET: 'short' });

    expect(error?.message).toContain('JWT_SECRET');
  });

  it('rejects an unrecognised NODE_ENV', () => {
    const { error } = validate({ ...MINIMAL_VALID_ENV, NODE_ENV: 'staging' });

    expect(error?.message).toContain('NODE_ENV');
  });

  it('rejects an unrecognised ROUTING_PROVIDER', () => {
    // The Joi .valid() allowlist is what actually enforces
    // TDR-routing-engine.md's "osrm is dev/test only" decision — anything
    // outside {mock, osrm} must fail, not silently pass through.
    const { error } = validate({ ...MINIMAL_VALID_ENV, ROUTING_PROVIDER: 'google-maps' });

    expect(error?.message).toContain('ROUTING_PROVIDER');
  });

  it('rejects an unrecognised BIOMETRIC_PROVIDER', () => {
    const { error } = validate({ ...MINIMAL_VALID_ENV, BIOMETRIC_PROVIDER: 'azure-face' });

    expect(error?.message).toContain('BIOMETRIC_PROVIDER');
  });

  it('rejects a non-positive VERIFICATION_VALIDITY_MINUTES', () => {
    const { error } = validate({ ...MINIMAL_VALID_ENV, VERIFICATION_VALIDITY_MINUTES: '0' });

    expect(error?.message).toContain('VERIFICATION_VALIDITY_MINUTES');
  });

  it('rejects an AWS_REKOGNITION_LIVENESS_MIN_CONFIDENCE outside 0-100', () => {
    const { error } = validate({
      ...MINIMAL_VALID_ENV,
      AWS_REKOGNITION_LIVENESS_MIN_CONFIDENCE: '150',
    });

    expect(error?.message).toContain('AWS_REKOGNITION_LIVENESS_MIN_CONFIDENCE');
  });

  it('collects every failure at once rather than stopping at the first', () => {
    // abortEarly: false — the real @nestjs/config default. A developer fixing
    // a broken .env should see all the problems in one run, not one crash
    // per fix.
    const { error } = validate({ JWT_SECRET: 'short', ROUTING_PROVIDER: 'nope' });

    expect(error?.message).toContain('DATABASE_URL');
    expect(error?.message).toContain('JWT_SECRET');
    expect(error?.message).toContain('ROUTING_PROVIDER');
  });
});
