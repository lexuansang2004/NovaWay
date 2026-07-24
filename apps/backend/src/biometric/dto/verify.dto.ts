import { IsString } from 'class-validator';

// R2-6 (docs/architecture/TDR-biometric-provider-spike.md) — the id of a
// Face Liveness session previously created via
// POST /vehicles/:id/verify/session. Treated as an opaque string here too:
// never inspected or persisted beyond the mock/AWS provider's own logic.
export class VerifyDto {
  @IsString()
  session_id!: string;
}
