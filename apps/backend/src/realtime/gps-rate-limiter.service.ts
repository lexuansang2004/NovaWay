import { Injectable } from '@nestjs/common';

// NFR-PERF-01 / OPEN_ITEMS_AFTER_MVP.md §5 — GPS event frequency must be
// rate-limited server-side. Initial conservative limit pending a real load
// benchmark. geolocator's 5m distanceFilter (apps/mobile/lib/services/
// geolocator_location_source.dart) can emit several events/second at
// highway speed, so the window is generous enough not to reject real
// traffic while still catching actual spam/abuse. Fixed-window counter,
// same in-memory-Map style as MismatchDetectionService — no external store
// needed at MVP single-instance scale.
const WINDOW_MS = 1000;
const MAX_EVENTS_PER_WINDOW = 10;

interface Window {
  windowStart: number;
  count: number;
}

@Injectable()
export class GpsRateLimiterService {
  private readonly windows = new Map<string, Window>();

  isAllowed(userId: string): boolean {
    const now = Date.now();
    const existing = this.windows.get(userId);

    if (!existing || now - existing.windowStart >= WINDOW_MS) {
      this.windows.set(userId, { windowStart: now, count: 1 });
      return true;
    }

    if (existing.count >= MAX_EVENTS_PER_WINDOW) {
      return false;
    }

    existing.count += 1;
    return true;
  }
}
