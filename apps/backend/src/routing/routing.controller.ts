import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoutingService } from './routing.service';
import { RoutePreviewDto } from './dto/route-preview.dto';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
}

// docs/API_CONTRACT.md §10.
@Controller('routes')
@UseGuards(JwtAuthGuard)
export class RoutingController {
  constructor(private readonly routingService: RoutingService) {}

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  async preview(@Req() req: AuthenticatedRequest, @Body() dto: RoutePreviewDto) {
    const route = await this.routingService.preview(req.user.id, dto);
    return {
      vehicle_type: route.vehicleType,
      distance_km: route.distanceKm,
      duration_min: route.durationMin,
      polyline: route.polyline,
    };
  }
}
