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
});
