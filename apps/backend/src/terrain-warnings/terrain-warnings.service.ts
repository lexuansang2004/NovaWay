import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { TERRAIN_WARNING_SOURCE, TerrainWarning, TerrainWarningSource } from './terrain-warning-source.interface';

// docs/API_CONTRACT.md §9 — GET /api/terrain-warnings?bbox=lat1,lng1,lat2,lng2.
// The two corners aren't guaranteed min/max order by the client, so this
// normalizes them before building the envelope.
@Injectable()
export class TerrainWarningsService {
  constructor(
    @Inject(TERRAIN_WARNING_SOURCE) private readonly terrainWarningSource: TerrainWarningSource,
  ) {}

  async getWarningsInBBox(bboxParam: string | undefined): Promise<TerrainWarning[]> {
    const bbox = this.parseBBox(bboxParam);
    return this.terrainWarningSource.getWarningsInBBox(bbox);
  }

  private parseBBox(bboxParam: string | undefined) {
    if (!bboxParam) {
      throw new BadRequestException('bbox là bắt buộc, dạng lat1,lng1,lat2,lng2');
    }

    const parts = bboxParam.split(',').map((part) => Number(part.trim()));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
      throw new BadRequestException('bbox phải là 4 số cách nhau bởi dấu phẩy: lat1,lng1,lat2,lng2');
    }

    const [lat1, lng1, lat2, lng2] = parts;
    if ([lat1, lat2].some((lat) => lat < -90 || lat > 90) || [lng1, lng2].some((lng) => lng < -180 || lng > 180)) {
      throw new BadRequestException('bbox chứa toạ độ ngoài phạm vi hợp lệ');
    }

    return {
      southWest: { lat: Math.min(lat1, lat2), lng: Math.min(lng1, lng2) },
      northEast: { lat: Math.max(lat1, lat2), lng: Math.max(lng1, lng2) },
    };
  }
}
