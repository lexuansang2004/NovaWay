// Mirrors API_CONTRACT.md §6 (WebSocket namespace `/realtime`).
// TODO: keep in sync by hand until the gateway (step 3.1) is implemented.

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
