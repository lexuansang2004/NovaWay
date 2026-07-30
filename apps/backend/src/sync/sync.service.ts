import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TripsService } from '../trips/trips.service';
import { Trip } from '../trips/trip.entity';
import { GpsEventsService } from '../realtime/gps-events.service';
import { SyncEventItemDto, SyncEventsDto } from './dto/sync-events.dto';

// docs/API_CONTRACT.md §7 — "tối đa 500 events/mảng events".
const MAX_BATCH_SIZE = 500;

// R7-1 — app.module.ts's TypeOrmModule.forRootAsync has no `extra.max`, so
// the pg pool defaults to 10 connections for the *entire process*, shared by
// every request. 5 leaves half the pool free for concurrent requests from
// other users/endpoints while still cutting batch wall time roughly 5x
// (each event's cost is dominated by DB round-trip latency, not CPU).
const EVENT_CONCURRENCY = 5;

interface FailedEvent {
  client_event_id: string;
  error_code: string;
  message: string;
}

export interface SyncResult {
  status: 'success' | 'partial_success' | 'all_failed';
  accepted: number;
  duplicate_count: number;
  failed_count: number;
  failed_events: FailedEvent[];
}

@Injectable()
export class SyncService {
  constructor(
    private readonly tripsService: TripsService,
    private readonly gpsEventsService: GpsEventsService,
  ) {}

  async syncEvents(userId: string, dto: SyncEventsDto): Promise<SyncResult> {
    if (dto.events.length > MAX_BATCH_SIZE) {
      throw new BadRequestException({
        error_code: 'BATCH_TOO_LARGE',
        message: `Batch vượt quá giới hạn ${MAX_BATCH_SIZE} events.`,
      });
    }

    // Ownership check only — no "trip must be active" requirement (unlike
    // /realtime's location:update). Offline events are collected *during* an
    // active trip but often flushed *after* the rider has already ended it
    // once connectivity returns, so requiring active status here would
    // reject the exact case this endpoint exists for.
    const trip = await this.tripsService.getOwnedTripOrThrow(dto.trip_id, userId);

    let accepted = 0;
    let duplicateCount = 0;
    const failedEvents: FailedEvent[] = [];

    // R7-1 — was a plain `for` + `await` (one DB round-trip per event,
    // fully serial). Each event's own transaction/dedup logic in
    // GpsEventsService is untouched; only the *scheduling* changed — a
    // chunk of EVENT_CONCURRENCY events runs via Promise.all, chunks still
    // run one after another so the pool never sees more than
    // EVENT_CONCURRENCY connections from this request at once.
    for (let i = 0; i < dto.events.length; i += EVENT_CONCURRENCY) {
      const chunk = dto.events.slice(i, i + EVENT_CONCURRENCY);
      const results = await Promise.all(chunk.map((rawEvent) => this.processEvent(rawEvent, trip, userId)));

      for (const result of results) {
        if (result.kind === 'failed') {
          failedEvents.push(result.failed);
        } else if (result.kind === 'accepted') {
          accepted++;
        } else {
          duplicateCount++;
        }
      }
    }

    return {
      status: this.resolveStatus(dto.events.length, accepted, failedEvents.length),
      accepted,
      duplicate_count: duplicateCount,
      failed_count: failedEvents.length,
      failed_events: failedEvents,
    };
  }

  private async processEvent(
    rawEvent: unknown,
    trip: Trip,
    userId: string,
  ): Promise<{ kind: 'failed'; failed: FailedEvent } | { kind: 'accepted' } | { kind: 'duplicate' }> {
    const clientEventId = this.extractClientEventId(rawEvent);
    const eventDto = plainToInstance(SyncEventItemDto, rawEvent);
    const errors = await validate(eventDto);

    if (errors.length > 0) {
      return {
        kind: 'failed',
        failed: {
          client_event_id: clientEventId,
          error_code: 'VALIDATION_ERROR',
          message: 'Sự kiện GPS không hợp lệ.',
        },
      };
    }

    // vehicle_id is always derived from the trip server-side, never
    // trusted from the client payload — same principle as
    // RealtimeGateway.handleLocationUpdate, which doesn't even accept a
    // vehicle_id from the client at all.
    const { persisted } = await this.gpsEventsService.recordEvent({
      tripId: trip.id,
      vehicleId: trip.vehicleId,
      userId,
      clientEventId: eventDto.client_event_id,
      latitude: eventDto.latitude,
      longitude: eventDto.longitude,
      speedKmh: eventDto.speed_kmh,
      accuracyM: eventDto.accuracy_m,
      eventTimestamp: eventDto.timestamp,
      syncChannel: 'batch',
    });

    return persisted ? { kind: 'accepted' } : { kind: 'duplicate' };
  }

  private resolveStatus(total: number, accepted: number, failedCount: number): SyncResult['status'] {
    if (total > 0 && failedCount === total) return 'all_failed';
    if (accepted === total) return 'success';
    return 'partial_success';
  }

  private extractClientEventId(rawEvent: unknown): string {
    if (typeof rawEvent === 'object' && rawEvent !== null && 'client_event_id' in rawEvent) {
      const value = (rawEvent as Record<string, unknown>).client_event_id;
      if (typeof value === 'string') return value;
    }
    return 'unknown';
  }
}
