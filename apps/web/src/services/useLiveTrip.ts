import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { LocationBroadcastPayload } from '@novaway/shared-types';
import type { LatLng } from '@/components/map/TripMap';
import { getToken } from '@/services/authService';
import { listTrips, type Trip } from '@/services/tripsService';

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? 'http://localhost:3000';
const ACTIVE_TRIP_POLL_MS = 5000;
// Matches apps/mobile's TripCockpitScreen trail cap (docs/roadmap/
// OPEN_ITEMS_AFTER_MVP.md §7) — bounds memory for a long-running trip.
const MAX_TRAIL_POINTS = 500;

// R5-9 (docs/roadmap/SPRINT_R5_DEPENDENCY_AND_COVERAGE.md) — the socket only
// ever listened for 'connect' and 'location:broadcast'. If the connection
// dropped (token expired, backend restarted) the position just stopped
// updating with zero feedback — silently wrong, worse than an error shown.
// Loosely mirrors apps/mobile's RealtimeConnectionState (services/
// realtime_client.dart); web only watches a trip, never starts/stops one,
// so it doesn't need mobile's 'rejected' state.
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface LiveTripState {
  trip: Trip | null;
  position: LatLng | null;
  speedKmh: number;
  trail: LatLng[];
  connectionStatus: ConnectionStatus;
}

const EMPTY_STATE: LiveTripState = {
  trip: null,
  position: null,
  speedKmh: 0,
  trail: [],
  connectionStatus: 'connecting',
};

// Web dashboard only *watches* a trip started on the rider's phone (biometric
// vehicle binding, FR-BIOMETRIC-01, is a mobile-only flow) — no start/stop
// control here. This polls for the current user's active trip and, once
// found, joins its realtime room to receive the same location:broadcast
// events apps/mobile's Trip Cockpit sends (docs/API_CONTRACT.md §6).
export function useLiveTrip() {
  const [state, setState] = useState<LiveTripState>(EMPTY_STATE);
  const socketRef = useRef<Socket | null>(null);
  const activeTripIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function teardownSocket() {
      socketRef.current?.disconnect();
      socketRef.current = null;
    }

    async function pollActiveTrip() {
      const token = getToken();
      if (!token) return;

      let trips: Trip[];
      try {
        trips = await listTrips();
      } catch {
        return; // transient network error — retry on next poll tick
      }
      if (cancelled) return;

      const activeTrip = trips.find((t) => t.status === 'active') ?? null;
      if (activeTrip?.id === activeTripIdRef.current) return; // no change since last poll

      teardownSocket();
      activeTripIdRef.current = activeTrip?.id ?? null;

      if (!activeTrip) {
        setState(EMPTY_STATE);
        return;
      }

      setState({ ...EMPTY_STATE, trip: activeTrip });

      const socket = io(`${WS_BASE_URL}/realtime`, { auth: { token }, transports: ['websocket'] });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join:trip', { trip_id: activeTrip.id });
        setState((s) => ({ ...s, connectionStatus: 'connected' }));
      });

      // socket.io's default `reconnection: true` (unset here, so it applies)
      // keeps retrying on its own — this only has to reflect that state, not
      // drive any retry logic. A later 'connect' flips connectionStatus back.
      socket.on('disconnect', () => {
        setState((s) => ({ ...s, connectionStatus: 'disconnected' }));
      });

      socket.on('connect_error', () => {
        setState((s) => ({ ...s, connectionStatus: 'error' }));
      });

      socket.on('location:broadcast', (payload: LocationBroadcastPayload) => {
        if (payload.trip_id !== activeTripIdRef.current) return;
        const position: LatLng = [payload.latitude, payload.longitude];
        setState((s) => ({
          ...s,
          position,
          speedKmh: payload.speed_kmh,
          trail: [...s.trail, position].slice(-MAX_TRAIL_POINTS),
          connectionStatus: 'connected',
        }));
      });
    }

    pollActiveTrip();
    const intervalId = setInterval(pollActiveTrip, ACTIVE_TRIP_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      teardownSocket();
    };
  }, []);

  return state;
}
