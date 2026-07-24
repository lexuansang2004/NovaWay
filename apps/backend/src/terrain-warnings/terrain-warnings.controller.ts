import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TerrainWarningsService } from './terrain-warnings.service';

// docs/API_CONTRACT.md §9 — read-only ở MVP.
@Controller('terrain-warnings')
@UseGuards(JwtAuthGuard)
export class TerrainWarningsController {
  constructor(private readonly terrainWarningsService: TerrainWarningsService) {}

  @Get()
  async list(@Query('bbox') bbox?: string) {
    const warnings = await this.terrainWarningsService.getWarningsInBBox(bbox);
    return {
      warnings: warnings.map((w) => ({
        id: w.id,
        location: w.location,
        severity: w.severity,
        description: w.description,
      })),
    };
  }
}
