import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  WEB_ORIGIN: Joi.string().uri().default('http://localhost:5173'),
  // docs/architecture/TDR-routing-engine.md — 'osrm' is dev/test only
  // (public demo server), production stays on 'mock' until a real
  // infra decision is made.
  ROUTING_PROVIDER: Joi.string().valid('mock', 'osrm').default('mock'),
  ROUTING_ENGINE_BASE_URL: Joi.string().uri().default('https://router.project-osrm.org'),
  ROUTING_ENGINE_TIMEOUT_MS: Joi.number().positive().default(3000),
  // docs/API_CONTRACT.md §5 POST /trips/start — closes the "Open Item"
  // left in API_REQUIREMENTS.md §9 ("đề xuất vài phút, cần chốt cụ thể").
  // 5 minutes: long enough to walk from face-scan to bike, short enough
  // that a handoff to a different driver after verifying can't reuse it.
  VERIFICATION_VALIDITY_MINUTES: Joi.number().positive().default(5),
  // docs/architecture/TDR-biometric-provider-spike.md (R2-6) — 'aws-rekognition'
  // makes real, billed AWS API calls and requires valid AWS credentials
  // (via the SDK's standard credential chain, not validated here) plus
  // confirmed ToS/DPA opt-out of AWS's default video retention — stays
  // 'mock' until that's confirmed for whichever environment sets this.
  BIOMETRIC_PROVIDER: Joi.string().valid('mock', 'aws-rekognition').default('mock'),
  // Face Liveness is only available in a handful of AWS regions — see
  // https://docs.aws.amazon.com/rekognition/latest/dg/face-liveness.html
  // (region list current as of 07/2026: us-east-1, us-west-2, eu-west-1,
  // ap-southeast-1, ap-southeast-2).
  AWS_REGION: Joi.string().default('us-east-1'),
  // AWS's own example code/docs use 90 as the pass/fail cutoff for the
  // Confidence score (0-100) returned by GetFaceLivenessSessionResults.
  AWS_REKOGNITION_LIVENESS_MIN_CONFIDENCE: Joi.number().min(0).max(100).default(90),
});
