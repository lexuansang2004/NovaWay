import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TripsService } from './trips.service';
import { StartTripDto } from './dto/start-trip.dto';
import { toTripDetailResponse, toTripListItemResponse, toTripWithLogResponse } from './trip.response';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
}

// docs/API_CONTRACT.md §5.
@Controller('trips')
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post('start')
  async start(@Req() req: AuthenticatedRequest, @Body() dto: StartTripDto) {
    const trip = await this.tripsService.start(req.user.id, dto);
    return { id: trip.id, vehicle_id: trip.vehicleId, status: trip.status, started_at: trip.startedAt };
  }

  @Post(':id/end')
  @HttpCode(HttpStatus.OK)
  async end(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const { trip, tripLog } = await this.tripsService.end(id, req.user.id);
    return toTripWithLogResponse(trip, tripLog);
  }

  @Get()
  async list(@Req() req: AuthenticatedRequest, @Query('vehicle_id') vehicleId?: string) {
    const entries = await this.tripsService.list(req.user.id, vehicleId);
    return {
      trips: entries.map((e) =>
        toTripListItemResponse(e.trip, e.distanceKm, e.durationMinutes, e.mismatchWarningCount),
      ),
    };
  }

  @Get(':id')
  async detail(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const { trip, tripLog, warnings } = await this.tripsService.findDetail(id, req.user.id);
    return toTripDetailResponse(trip, tripLog, warnings);
  }
}
