import { Module } from '@nestjs/common';
import { TerrainWarningsController } from './terrain-warnings.controller';
import { TerrainWarningsService } from './terrain-warnings.service';
import { TERRAIN_WARNING_SOURCE } from './terrain-warning-source.interface';
import { DbTerrainWarningSource } from './db-terrain-warning.source';

// docs/ARCHITECTURE.md §3.1 — no dependency on other modules.
@Module({
  controllers: [TerrainWarningsController],
  providers: [
    TerrainWarningsService,
    { provide: TERRAIN_WARNING_SOURCE, useClass: DbTerrainWarningSource },
  ],
})
export class TerrainWarningsModule {}
