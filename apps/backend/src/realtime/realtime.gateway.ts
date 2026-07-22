import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { LocationBroadcastPayload, MismatchWarningPayload } from '@novaway/shared-types';
import { TripsService } from '../trips/trips.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { MismatchDetectionService } from '../mismatch-detection/mismatch-detection.service';
import { MetricsService } from '../observability/metrics.service';
import { GpsEventsService } from './gps-events.service';
import { GpsRateLimiterService } from './gps-rate-limiter.service';
import { LocationUpdateDto } from './dto/location-update.dto';

interface AuthenticatedSocketData {
  userId?: string;
}

function tripRoom(tripId: string): string {
  return `trip:${tripId}`;
}

// docs/API_CONTRACT.md §6 — namespace /realtime.
@WebSocketGateway({ namespace: 'realtime', cors: true })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly tripsService: TripsService,
    private readonly vehiclesService: VehiclesService,
    private readonly gpsEventsService: GpsEventsService,
    private readonly gpsRateLimiterService: GpsRateLimiterService,
    private readonly mismatchDetectionService: MismatchDetectionService,
    private readonly metricsService: MetricsService,
  ) {}

  handleConnection(client: Socket): void {
    const token = this.extractToken(client);
    if (!token) {
      this.rejectConnection(client);
      return;
    }

    try {
      const payload = this.jwtService.verify<{ sub: string }>(token);
      (client.data as AuthenticatedSocketData).userId = payload.sub;
      this.metricsService.gaugeIncrement('ws_connections_current', {}, 1);
      this.logger.log(`Connected: user=${payload.sub} socket=${client.id}`);
    } catch {
      this.rejectConnection(client);
    }
  }

  handleDisconnect(client: Socket): void {
    // Socket.io removes the socket from all rooms automatically on
    // disconnect — no extra cleanup needed at MVP in-memory-room scale.
    if ((client.data as AuthenticatedSocketData).userId) {
      this.metricsService.gaugeIncrement('ws_connections_current', {}, -1);
      this.logger.log(`Disconnected: socket=${client.id}`);
    }
  }

  // Lets a viewer (e.g. web dashboard, step 3.2) join a trip's broadcast
  // room. Not itself part of docs/API_CONTRACT.md §6 (which only specifies
  // location:update / location:broadcast / mismatch:warning /
  // location:rejected) — this fills the undocumented gap of "how does a
  // client start watching a trip", scoped to the trip's own owner only,
  // matching FR-REALTIME-03. Subject to refinement at step 3.2.
  @SubscribeMessage('join:trip')
  async handleJoinTrip(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { trip_id?: string },
  ): Promise<void> {
    const userId = (client.data as AuthenticatedSocketData).userId;
    if (!userId || !body?.trip_id) {
      return;
    }

    const trip = await this.tripsService.findById(body.trip_id);
    if (!trip || trip.userId !== userId) {
      return;
    }

    await client.join(tripRoom(trip.id));
  }

  @SubscribeMessage('location:update')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    const userId = (client.data as AuthenticatedSocketData).userId;
    if (!userId) {
      client.disconnect(true);
      return;
    }

    const clientEventId = this.extractClientEventId(body);

    if (!this.gpsRateLimiterService.isAllowed(userId)) {
      this.reject(client, clientEventId, 'RATE_LIMITED');
      return;
    }

    const dto = plainToInstance(LocationUpdateDto, body);
    const errors = await validate(dto);
    if (errors.length > 0) {
      this.reject(client, clientEventId, 'VALIDATION_ERROR');
      return;
    }

    // FR-REALTIME-02: trip_id must belong to the authenticated sender.
    const trip = await this.tripsService.findById(dto.trip_id);
    if (!trip || trip.userId !== userId) {
      this.reject(client, clientEventId, 'TRIP_NOT_FOUND');
      return;
    }
    if (trip.status !== 'active') {
      this.reject(client, clientEventId, 'TRIP_NOT_ACTIVE');
      return;
    }

    const { persisted } = await this.gpsEventsService.recordEvent({
      tripId: trip.id,
      vehicleId: trip.vehicleId,
      userId,
      clientEventId: dto.client_event_id,
      latitude: dto.latitude,
      longitude: dto.longitude,
      speedKmh: dto.speed_kmh,
      accuracyM: dto.accuracy_m,
      eventTimestamp: dto.timestamp,
    });

    if (!persisted) {
      // Duplicate client_event_id — already recorded once; do not re-broadcast.
      return;
    }

    this.metricsService.increment('gps_events_processed_total');
    this.logger.debug(`location:update accepted trip=${trip.id} speed=${dto.speed_kmh}km/h`);

    await client.join(tripRoom(trip.id));

    const broadcastPayload: LocationBroadcastPayload = {
      trip_id: trip.id,
      vehicle_id: trip.vehicleId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      speed_kmh: dto.speed_kmh,
      timestamp: dto.timestamp,
    };
    this.server.to(tripRoom(trip.id)).emit('location:broadcast', broadcastPayload);

    // docs/ARCHITECTURE.md §6 — MismatchDetectionModule evaluates inline,
    // alongside the broadcast, not blocking or gating it either way.
    const vehicle = await this.vehiclesService.findById(trip.vehicleId);
    if (vehicle) {
      const warning = await this.mismatchDetectionService.evaluate(
        trip.id,
        vehicle.type,
        dto.speed_kmh,
        dto.timestamp,
      );
      if (warning) {
        const warningPayload: MismatchWarningPayload = {
          trip_id: trip.id,
          warning_id: warning.id,
          declared_vehicle_type: warning.declaredVehicleType,
          observed_behavior_summary: warning.observedBehaviorSummary,
        };
        this.server.to(tripRoom(trip.id)).emit('mismatch:warning', warningPayload);
      }
    }
  }

  private reject(client: Socket, clientEventId: string | undefined, errorCode: string): void {
    this.metricsService.increment('gps_events_rejected_total', { reason: errorCode });
    this.logger.warn(`location:update rejected error_code=${errorCode} client_event_id=${clientEventId}`);
    client.emit('location:rejected', { client_event_id: clientEventId, error_code: errorCode });
  }

  private extractClientEventId(body: unknown): string | undefined {
    if (typeof body === 'object' && body !== null && 'client_event_id' in body) {
      const value = (body as Record<string, unknown>).client_event_id;
      return typeof value === 'string' ? value : undefined;
    }
    return undefined;
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length);
    }
    return undefined;
  }

  private rejectConnection(client: Socket): void {
    client.emit('connection:rejected', { error_code: 'UNAUTHORIZED' });
    client.disconnect(true);
  }
}
