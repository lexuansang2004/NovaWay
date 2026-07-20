import { Body, Controller, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BiometricService } from './biometric.service';
import { VerifyDto } from './dto/verify.dto';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
}

@Controller('vehicles/:vehicleId')
@UseGuards(JwtAuthGuard)
export class BiometricController {
  constructor(private readonly biometricService: BiometricService) {}

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
