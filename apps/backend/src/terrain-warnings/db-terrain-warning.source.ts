import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BoundingBox, TerrainWarning, TerrainWarningSource } from './terrain-warning-source.interface';

interface TerrainWarningRow {
  id: string;
  lat: string;
  lng: string;
  severity: 'warning' | 'danger';
  description: string | null;
}

// docs/DATA_MODEL.md §2.9 — location is GEOGRAPHY(Point, 4326); no TypeORM
// entity maps it (same convention as raw_gps_events, see gps-events.service.ts)
// since TypeORM has no first-class geography column support — raw SQL via
// DataSource is used instead, consistent with the rest of this codebase's
// PostGIS-touching code.
@Injectable()
export class DbTerrainWarningSource implements TerrainWarningSource {
  constructor(private readonly dataSource: DataSource) {}

  async getWarningsInBBox(bbox: BoundingBox): Promise<TerrainWarning[]> {
    const rows: TerrainWarningRow[] = await this.dataSource.query(
      `SELECT id, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng, severity, description
       FROM terrain_warnings
       WHERE ST_Intersects(location, ST_MakeEnvelope($1, $2, $3, $4, 4326)::geography)`,
      [bbox.southWest.lng, bbox.southWest.lat, bbox.northEast.lng, bbox.northEast.lat],
    );

    return rows.map((row) => ({
      id: row.id,
      location: { lat: Number(row.lat), lng: Number(row.lng) },
      severity: row.severity,
      description: row.description,
    }));
  }
}
