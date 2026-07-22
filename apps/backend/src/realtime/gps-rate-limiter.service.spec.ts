import { Test, TestingModule } from '@nestjs/testing';
import { GpsRateLimiterService } from './gps-rate-limiter.service';

describe('GpsRateLimiterService', () => {
  let service: GpsRateLimiterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GpsRateLimiterService],
    }).compile();

    service = module.get(GpsRateLimiterService);
    jest.useFakeTimers().setSystemTime(new Date('2026-07-18T13:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows up to the per-window limit', () => {
    for (let i = 0; i < 10; i += 1) {
      expect(service.isAllowed('user-id')).toBe(true);
    }
  });

  it('rejects the event once the per-window limit is exceeded', () => {
    for (let i = 0; i < 10; i += 1) {
      service.isAllowed('user-id');
    }

    expect(service.isAllowed('user-id')).toBe(false);
  });

  it('resets the count once the window elapses', () => {
    for (let i = 0; i < 10; i += 1) {
      service.isAllowed('user-id');
    }
    expect(service.isAllowed('user-id')).toBe(false);

    jest.advanceTimersByTime(1001);

    expect(service.isAllowed('user-id')).toBe(true);
  });

  it('tracks each user independently', () => {
    for (let i = 0; i < 10; i += 1) {
      service.isAllowed('user-a');
    }

    expect(service.isAllowed('user-a')).toBe(false);
    expect(service.isAllowed('user-b')).toBe(true);
  });
});
