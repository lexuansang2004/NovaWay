import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from './sync.service';
import { TripsService } from '../trips/trips.service';
import { GpsEventsService } from '../realtime/gps-events.service';

describe('SyncService', () => {
  let service: SyncService;
  let tripsService: jest.Mocked<Pick<TripsService, 'getOwnedTripOrThrow'>>;
  let gpsEventsService: jest.Mocked<Pick<GpsEventsService, 'recordEvent'>>;

  const USER_ID = 'user-id';
  const TRIP_ID = 'trip-id';
  const VEHICLE_ID = 'vehicle-id';

  const validEvent = (overrides: Record<string, unknown> = {}) => ({
    client_event_id: 'a1000000-0000-4000-8000-000000000001',
    vehicle_id: 'a2000000-0000-4000-8000-000000000002',
    timestamp: '2026-07-18T13:00:00.000Z',
    latitude: 10.762622,
    longitude: 106.660172,
    speed_kmh: 35.5,
    accuracy_m: 12,
    source: 'gps',
    ...overrides,
  });

  beforeEach(async () => {
    tripsService = { getOwnedTripOrThrow: jest.fn() };
    gpsEventsService = { recordEvent: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: TripsService, useValue: tripsService },
        { provide: GpsEventsService, useValue: gpsEventsService },
      ],
    }).compile();

    service = module.get(SyncService);

    tripsService.getOwnedTripOrThrow.mockResolvedValue({ id: TRIP_ID, vehicleId: VEHICLE_ID } as never);
  });

  it('rejects a batch over 500 events without checking trip ownership', async () => {
    const events = Array.from({ length: 501 }, () => validEvent());

    await expect(service.syncEvents(USER_ID, { trip_id: TRIP_ID, events })).rejects.toThrow(BadRequestException);
    expect(tripsService.getOwnedTripOrThrow).not.toHaveBeenCalled();
  });

  it('returns success when every event is accepted', async () => {
    gpsEventsService.recordEvent.mockResolvedValue({ persisted: true });

    const result = await service.syncEvents(USER_ID, { trip_id: TRIP_ID, events: [validEvent(), validEvent()] });

    expect(result).toEqual({
      status: 'success',
      accepted: 2,
      duplicate_count: 0,
      failed_count: 0,
      failed_events: [],
    });
    expect(tripsService.getOwnedTripOrThrow).toHaveBeenCalledWith(TRIP_ID, USER_ID);
    // vehicle_id always derives from the trip, never trusted from the event payload.
    expect(gpsEventsService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ tripId: TRIP_ID, vehicleId: VEHICLE_ID, syncChannel: 'batch' }),
    );
  });

  it('counts a duplicate client_event_id separately from accepted/failed', async () => {
    gpsEventsService.recordEvent.mockResolvedValue({ persisted: false });

    const result = await service.syncEvents(USER_ID, { trip_id: TRIP_ID, events: [validEvent()] });

    expect(result.status).toBe('partial_success');
    expect(result.accepted).toBe(0);
    expect(result.duplicate_count).toBe(1);
    expect(result.failed_count).toBe(0);
  });

  it('routes a malformed event to failed_events without aborting the rest of the batch', async () => {
    gpsEventsService.recordEvent.mockResolvedValue({ persisted: true });

    const badEvent = validEvent({ latitude: 999 }); // out of range
    const result = await service.syncEvents(USER_ID, {
      trip_id: TRIP_ID,
      events: [badEvent, validEvent()],
    });

    expect(result.status).toBe('partial_success');
    expect(result.accepted).toBe(1);
    expect(result.failed_count).toBe(1);
    expect(result.failed_events[0]).toEqual({
      client_event_id: badEvent.client_event_id,
      error_code: 'VALIDATION_ERROR',
      message: expect.any(String),
    });
    expect(gpsEventsService.recordEvent).toHaveBeenCalledTimes(1);
  });

  it('returns all_failed when every event is invalid', async () => {
    const result = await service.syncEvents(USER_ID, {
      trip_id: TRIP_ID,
      events: [validEvent({ latitude: 999 })],
    });

    expect(result.status).toBe('all_failed');
    expect(gpsEventsService.recordEvent).not.toHaveBeenCalled();
  });
});
