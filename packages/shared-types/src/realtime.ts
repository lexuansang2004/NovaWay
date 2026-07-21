// Mirrors API_CONTRACT.md §6 (WebSocket namespace `/realtime`).
// Hand-maintained by design — this package has no schema-to-types codegen
// (mobile isn't TypeScript, so API_CONTRACT.md stays the cross-platform
// contract; this package is just a backend<->web convenience). Update
// alongside apps/backend/src/realtime/realtime.gateway.ts.

export interface LocationUpdatePayload {
  trip_id: string;
  client_event_id: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  accuracy_m: number;
  timestamp: string;
}

export interface LocationBroadcastPayload {
  trip_id: string;
  vehicle_id: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  timestamp: string;
}

export interface MismatchWarningPayload {
  trip_id: string;
  warning_id: string;
  declared_vehicle_type: string;
  observed_behavior_summary: string;
}
