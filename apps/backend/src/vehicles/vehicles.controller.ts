import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { toVehicleResponse } from './vehicle.response';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
}

@Controller('vehicles')
@UseGuards(JwtAuthGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  async findAll(@Req() req: AuthenticatedRequest) {
    const vehicles = await this.vehiclesService.findAllByUser(req.user.id);
    return { vehicles: vehicles.map(toVehicleResponse) };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateVehicleDto) {
    const vehicle = await this.vehiclesService.create(req.user.id, dto);
    return toVehicleResponse(vehicle);
  }

  @Patch(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    const vehicle = await this.vehiclesService.update(id, req.user.id, dto);
    return toVehicleResponse(vehicle);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: AuthenticatedRequest, @Param('id') id: string): Promise<void> {
    await this.vehiclesService.remove(id, req.user.id);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  async activate(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const vehicle = await this.vehiclesService.activate(id, req.user.id);
    return { id: vehicle.id, is_active: vehicle.isActive };
  }
}
