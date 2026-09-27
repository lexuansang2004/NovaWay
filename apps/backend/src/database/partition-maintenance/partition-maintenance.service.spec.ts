import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { PartitionMaintenanceService } from './partition-maintenance.service';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('PartitionMaintenanceService', () => {
  let service: PartitionMaintenanceService;
  let query: jest.Mock;

  beforeEach(async () => {
    query = jest.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [PartitionMaintenanceService, { provide: DataSource, useValue: { query } }],
    }).compile();

    service = module.get(PartitionMaintenanceService);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('(a) successful bootstrap calls the ensure routine once and schedules the periodic interval', async () => {
    await service.onApplicationBootstrap();
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith('SELECT ensure_raw_gps_partitions()');

    jest.advanceTimersByTime(DAY_MS);
    await Promise.resolve();

    expect(query).toHaveBeenCalledTimes(2);
  });

  it('(b) failed bootstrap rejects and does NOT schedule the periodic interval', async () => {
    query.mockRejectedValueOnce(new Error('relation "raw_gps_events" does not exist'));
    const errorSpy = jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);

    await expect(service.onApplicationBootstrap()).rejects.toThrow(
      'relation "raw_gps_events" does not exist',
    );
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('relation "raw_gps_events" does not exist'));
    expect(query).toHaveBeenCalledTimes(1);

    // No interval was ever scheduled — advancing time, even by several days,
    // must not produce any further call.
    jest.advanceTimersByTime(DAY_MS * 3);
    await Promise.resolve();

    expect(query).toHaveBeenCalledTimes(1);
  });

  it('(c) a periodic (post-bootstrap) failure is only logged, not thrown, and does not stop future retries', async () => {
    const errorSpy = jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);

    await service.onApplicationBootstrap();
    expect(query).toHaveBeenCalledTimes(1);

    query.mockRejectedValueOnce(new Error('advisory lock timeout'));
    jest.advanceTimersByTime(DAY_MS);
    // Flush the rejected promise's microtask queue — this would surface as
    // an unhandled rejection (failing the test run) if the periodic path
    // didn't catch it.
    await Promise.resolve();
    await Promise.resolve();

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('advisory lock timeout'));

    // The interval itself must still be alive for the next scheduled run —
    // one failure doesn't clear it.
    query.mockResolvedValueOnce(undefined);
    jest.advanceTimersByTime(DAY_MS);
    await Promise.resolve();

    expect(query).toHaveBeenCalledTimes(3);
  });

  it('(d) shutdown clears the periodic timer, so no further calls happen', async () => {
    await service.onApplicationBootstrap();
    expect(query).toHaveBeenCalledTimes(1);

    service.onApplicationShutdown();

    jest.advanceTimersByTime(DAY_MS * 3);
    await Promise.resolve();

    expect(query).toHaveBeenCalledTimes(1);
  });

  it('(e) applies unref() to the periodic timer where the runtime supports it', async () => {
    const fakeTimer = { unref: jest.fn(), ref: jest.fn() } as unknown as NodeJS.Timeout;
    const setIntervalSpy = jest.spyOn(global, 'setInterval').mockReturnValue(fakeTimer);

    await service.onApplicationBootstrap();

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(fakeTimer.unref).toHaveBeenCalledTimes(1);

    setIntervalSpy.mockRestore();
  });
});
