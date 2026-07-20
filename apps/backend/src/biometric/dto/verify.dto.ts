import { IsString } from 'class-validator';

// Payload shape is a placeholder pending real provider selection
// (API_CONTRACT.md §4, FR-BIOMETRIC-05) — treated as an opaque string,
// never inspected or persisted beyond the mock provider's own logic.
export class VerifyDto {
  @IsString()
  provider_payload!: string;
}
