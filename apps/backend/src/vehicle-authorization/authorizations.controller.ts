import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VehicleAuthorizationService } from './vehicle-authorization.service';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
}

@Controller('authorizations')
@UseGuards(JwtAuthGuard)
export class AuthorizationsController {
  constructor(private readonly authorizationService: VehicleAuthorizationService) {}

  @Get('me')
  async me(@Req() req: AuthenticatedRequest) {
    const authorizations = await this.authorizationService.findAllForBorrower(req.user.id);
    return { authorizations };
  }
}
