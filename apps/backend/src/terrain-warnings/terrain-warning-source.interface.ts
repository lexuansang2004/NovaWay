export interface LatLng {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  southWest: LatLng;
  northEast: LatLng;
}

export interface TerrainWarning {
  id: string;
  location: LatLng;
  severity: 'warning' | 'danger';
  description: string | null;
}

// docs/ARCHITECTURE.md §3.2 — MVP implementation reads seed/mock rows from
// the terrain_warnings table (DbTerrainWarningSource); a future Computer
// Vision pipeline is a different *writer* into the same table/columns
// (source='computer_vision'), not a different adapter — this interface
// doesn't need to change for that swap, unlike RoutingProvider/
// BiometricProvider which do swap implementation.
export const TERRAIN_WARNING_SOURCE = Symbol('TERRAIN_WARNING_SOURCE');

export interface TerrainWarningSource {
  getWarningsInBBox(bbox: BoundingBox): Promise<TerrainWarning[]>;
}
