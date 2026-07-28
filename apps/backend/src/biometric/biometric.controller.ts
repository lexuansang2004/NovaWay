import { Body, Controller, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BiometricService } from './biometric.service';
import { VerifyDto } from './dto/verify.dto';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
}

// R6-1 (docs/roadmap/SPRINT_R6_SECURITY_HARDENING.md) — both routes below are
// real, billed AWS Rekognition calls once BIOMETRIC_PROVIDER=aws-rekognition
// (createSession -> CreateFaceLivenessSession, verify ->
// GetFaceLivenessSessionResults). Locked down before that provider is ever
// turned on, not after — same posture as R1-4/R2-2's login/GPS/sync limits.
// AppModule's 'default' throttler (5 attempts/min/IP); JwtAuthGuard runs
// first so an unauthenticated request is rejected before it ever consumes a
// throttle-bucket slot.
@Controller('vehicles/:vehicleId')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class BiometricController {
  constructor(private readonly biometricService: BiometricService) {}

  // R2-6 — must be called before verify(): the returned session_id is what
  // the client's AWS Face Liveness capture SDK session is tied to.
  @Post('verify/session')
  @HttpCode(HttpStatus.CREATED)
  async createSession(@Req() req: AuthenticatedRequest, @Param('vehicleId') vehicleId: string) {
    const { sessionId } = await this.biometricService.createSession(vehicleId, req.user.id);
    return { session_id: sessionId };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(
    @Req() req: AuthenticatedRequest,
    @Param('vehicleId') vehicleId: string,
    @Body() dto: VerifyDto,
  ) {
    const outcome = await this.biometricService.verify(vehicleId, req.user.id, dto);

    if (outcome.result === 'success') {
      return { verification_id: outcome.verificationId, result: 'success' as const };
    }
    return {
      verification_id: outcome.verificationId,
      result: 'failed' as const,
      error_code: outcome.errorCode,
    };
  }
}
