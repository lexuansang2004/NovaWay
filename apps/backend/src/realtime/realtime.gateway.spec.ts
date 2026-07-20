import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { TripsService } from '../trips/trips.service';
import { GpsEventsService } from './gps-events.service';
import { Trip } from '../trips/trip.entity';

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let jwtService: jest.Mocked<JwtService>;
  let tripsService: jest.Mocked<TripsService>;
  let gpsEventsService: jest.Mocked<GpsEventsService>;

  const TRIP_ID = '11111111-1111-4111-8111-111111111111';
  const CLIENT_EVENT_ID = '22222222-2222-4222-8222-222222222222';

  const buildTrip = (overrides: Partial<Trip> = {}): Trip => ({
    id: TRIP_ID,
    userId: 'user-id',
    vehicleId: 'vehicle-id',
    biometricVerificationId: 'verification-id',
    status: 'active',
    consentAt: new Date(),
    startedAt: new Date(),
    endedAt: null,
    ...overrides,
  });

  function buildSocket(overrides: Partial<{ auth: unknown; headers: Record<string, string> }> = {}) {
    return {
      data: {},
      handshake: { auth: overrides.auth ?? {}, headers: overrides.headers ?? {} },
      emit: jest.fn(),
      disconnect: jest.fn(),
      join: jest.fn().mockResolvedValue(undefined),
    };
  }

  const validPayload = {
    trip_id: TRIP_ID,
    client_event_id: CLIENT_EVENT_ID,
    latitude: 10.762622,
    longitude: 106.660172,
    speed_kmh: 35.5,
    accuracy_m: 12,
    timestamp: '2026-07-18T13:00:00.000Z',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        { provide: JwtService, useValue: { verify: jest.fn() } },
        { provide: TripsService, useValue: { findById: jest.fn() } },
        { provide: GpsEventsService, useValue: { recordEvent: jest.fn() } },
      ],
    }).compile();

    gateway = module.get(RealtimeGateway);
    jwtService = module.get(JwtService);
    tripsService = module.get(TripsService);
    gpsEventsService = module.get(GpsEventsService);
    gateway.server = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) } as never;
  });

  describe('handleConnection', () => {
    it('sets userId on the socket when the token is valid', () => {
      jwtService.verify.mockReturnValue({ sub: 'user-id' });
      const client = buildSocket({ auth: { token: 'valid-token' } });

      gateway.handleConnection(client as never);

      expect(client.data).toEqual({ userId: 'user-id' });
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('rejects and disconnects when no token is provided', () => {
      const client = buildSocket();

      gateway.handleConnection(client as never);

      expect(client.emit).toHaveBeenCalledWith('connection:rejected', { error_code: 'UNAUTHORIZED' });
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('rejects and disconnects when the token is invalid', () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });
      const client = buildSocket({ auth: { token: 'bad-token' } });

      gateway.handleConnection(client as never);

      expect(client.emit).toHaveBeenCalledWith('connection:rejected', { error_code: 'UNAUTHORIZED' });
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('handleLocationUpdate', () => {
    it('rejects with VALIDATION_ERROR for an out-of-range coordinate, without touching the DB', async () => {
      const client = buildSocket();
      client.data = { userId: 'user-id' };

      await gateway.handleLocationUpdate(client as never, { ...validPayload, latitude: 999 });

      expect(client.emit).toHaveBeenCalledWith('location:rejected', {
        client_event_id: CLIENT_EVENT_ID,
        error_code: 'VALIDATION_ERROR',
      });
      expect(tripsService.findById).not.toHaveBeenCalled();
      expect(gpsEventsService.recordEvent).not.toHaveBeenCalled();
    });

    it('rejects with TRIP_NOT_FOUND when the trip does not belong to the sender', async () => {
      const client = buildSocket();
      client.data = { userId: 'stranger-id' };
      tripsService.findById.mockResolvedValue(buildTrip({ userId: 'owner-id' }));

      await gateway.handleLocationUpdate(client as never, validPayload);

      expect(client.emit).toHaveBeenCalledWith('location:rejected', {
        client_event_id: CLIENT_EVENT_ID,
        error_code: 'TRIP_NOT_FOUND',
      });
      expect(gpsEventsService.recordEvent).not.toHaveBeenCalled();
    });

    it('rejects with TRIP_NOT_ACTIVE for an ended trip', async () => {
      const client = buildSocket();
      client.data = { userId: 'user-id' };
      tripsService.findById.mockResolvedValue(buildTrip({ status: 'ended' }));

      await gateway.handleLocationUpdate(client as never, validPayload);

      expect(client.emit).toHaveBeenCalledWith('location:rejected', {
        client_event_id: CLIENT_EVENT_ID,
        error_code: 'TRIP_NOT_ACTIVE',
      });
    });

    it('persists and broadcasts a valid event to the trip room', async () => {
      const client = buildSocket();
      client.data = { userId: 'user-id' };
      tripsService.findById.mockResolvedValue(buildTrip());
      gpsEventsService.recordEvent.mockResolvedValue({ persisted: true });
      const roomEmit = jest.fn();
      (gateway.server.to as jest.Mock).mockReturnValue({ emit: roomEmit });

      await gateway.handleLocationUpdate(client as never, validPayload);

      expect(gpsEventsService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ tripId: TRIP_ID, vehicleId: 'vehicle-id', userId: 'user-id' }),
      );
      expect(client.join).toHaveBeenCalledWith(`trip:${TRIP_ID}`);
      expect(gateway.server.to).toHaveBeenCalledWith(`trip:${TRIP_ID}`);
      expect(roomEmit).toHaveBeenCalledWith(
        'location:broadcast',
        expect.objectContaining({ trip_id: TRIP_ID, vehicle_id: 'vehicle-id' }),
      );
    });

    it('does not broadcast a duplicate client_event_id', async () => {
      const client = buildSocket();
      client.data = { userId: 'user-id' };
      tripsService.findById.mockResolvedValue(buildTrip());
      gpsEventsService.recordEvent.mockResolvedValue({ persisted: false });

      await gateway.handleLocationUpdate(client as never, validPayload);

      expect(gateway.server.to).not.toHaveBeenCalled();
      expect(client.emit).not.toHaveBeenCalledWith('location:rejected', expect.anything());
    });

    it('disconnects a socket that never authenticated', async () => {
      const client = buildSocket();

      await gateway.handleLocationUpdate(client as never, validPayload);

      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(tripsService.findById).not.toHaveBeenCalled();
    });
  });
});
