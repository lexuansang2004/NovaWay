import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VehicleAuthorizationService } from './vehicle-authorization.service';
import { CreateAuthorizationDto } from './dto/create-authorization.dto';
import { toAuthorizationResponse } from './authorization.response';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
}

@Controller('vehicles/:vehicleId/authorizations')
@UseGuards(JwtAuthGuard)
export class VehicleAuthorizationController {
  constructor(private readonly authorizationService: VehicleAuthorizationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async grant(
    @Req() req: AuthenticatedRequest,
    @Param('vehicleId') vehicleId: string,
    @Body() dto: CreateAuthorizationDto,
  ) {
    const authorization = await this.authorizationService.grant(vehicleId, req.user.id, dto);
    return toAuthorizationResponse(authorization);
  }

  @Get()
  async findAll(@Req() req: AuthenticatedRequest, @Param('vehicleId') vehicleId: string) {
    const authorizations = await this.authorizationService.findAllForVehicleOwner(vehicleId, req.user.id);
    return { authorizations: authorizations.map(toAuthorizationResponse) };
  }

  @Delete(':authId')
  async revoke(
    @Req() req: AuthenticatedRequest,
    @Param('vehicleId') vehicleId: string,
    @Param('authId') authId: string,
  ) {
    const authorization = await this.authorizationService.revoke(vehicleId, authId, req.user.id);
    return toAuthorizationResponse(authorization);
  }
}
