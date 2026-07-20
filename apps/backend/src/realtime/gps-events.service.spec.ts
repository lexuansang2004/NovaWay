import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { GpsEventsService } from './gps-events.service';

describe('GpsEventsService', () => {
  let service: GpsEventsService;
  let dataSource: jest.Mocked<DataSource>;

  const input = {
    tripId: 'trip-id',
    vehicleId: 'vehicle-id',
    userId: 'user-id',
    clientEventId: 'client-event-id',
    latitude: 10.762622,
    longitude: 106.660172,
    speedKmh: 35.5,
    accuracyM: 12,
    eventTimestamp: '2026-07-18T13:00:00.000Z',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GpsEventsService, { provide: DataSource, useValue: { transaction: jest.fn() } }],
    }).compile();

    service = module.get(GpsEventsService);
    dataSource = module.get(DataSource);
  });

  it('persists the event when the dedup insert is not a conflict', async () => {
    (dataSource.transaction as jest.Mock).mockImplementation(async (cb) => {
      const manager = {
        query: jest
          .fn()
          .mockResolvedValueOnce([{ id: '42' }]) // raw_gps_events insert
          .mockResolvedValueOnce([{ raw_gps_event_id: '42' }]), // dedup insert succeeds
      };
      return cb(manager);
    });

    const result = await service.recordEvent(input);

    expect(result).toEqual({ persisted: true });
  });

  it('rolls back and reports not-persisted on a duplicate client_event_id', async () => {
    (dataSource.transaction as jest.Mock).mockImplementation(async (cb) => {
      const manager = {
        query: jest
          .fn()
          .mockResolvedValueOnce([{ id: '42' }]) // raw_gps_events insert still happens
          .mockResolvedValueOnce([]), // dedup insert conflicts -> ON CONFLICT DO NOTHING -> 0 rows
      };
      return cb(manager);
    });

    const result = await service.recordEvent(input);

    expect(result).toEqual({ persisted: false });
  });

  it('propagates unexpected errors instead of swallowing them', async () => {
    (dataSource.transaction as jest.Mock).mockRejectedValue(new Error('connection lost'));

    await expect(service.recordEvent(input)).rejects.toThrow('connection lost');
  });
});
