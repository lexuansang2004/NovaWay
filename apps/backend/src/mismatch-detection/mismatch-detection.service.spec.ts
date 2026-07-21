import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MismatchDetectionService } from './mismatch-detection.service';
import { VehicleMismatchWarning } from './vehicle-mismatch-warning.entity';
import { MetricsService } from '../observability/metrics.service';

describe('MismatchDetectionService', () => {
  let service: MismatchDetectionService;
  let repo: jest.Mocked<Repository<VehicleMismatchWarning>>;

  const TRIP_ID = '11111111-1111-4111-8111-111111111111';
  const T0 = '2026-07-18T13:00:00.000Z';
  const plusMinutes = (min: number) => new Date(new Date(T0).getTime() + min * 60000).toISOString();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MismatchDetectionService,
        {
          provide: getRepositoryToken(VehicleMismatchWarning),
          useValue: { create: jest.fn((d) => d), save: jest.fn(), find: jest.fn() },
        },
        { provide: MetricsService, useValue: { increment: jest.fn() } },
      ],
    }).compile();

    service = module.get(MismatchDetectionService);
    repo = module.get(getRepositoryToken(VehicleMismatchWarning));
    repo.save.mockImplementation(async (w) => ({ id: 'warning-id', ...w }) as VehicleMismatchWarning);
  });

  it('never triggers for a car (no threshold defined in MVP)', async () => {
    const result = await service.evaluate(TRIP_ID, 'car', 200, T0);

    expect(result).toBeNull();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('does not warn for a brief spike under 3 minutes', async () => {
    await service.evaluate(TRIP_ID, 'motorbike', 85, T0);
    const result = await service.evaluate(TRIP_ID, 'motorbike', 85, plusMinutes(1));

    expect(result).toBeNull();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('warns once speed stays above threshold for a full 3 minutes', async () => {
    await service.evaluate(TRIP_ID, 'motorbike', 85, T0);
    await service.evaluate(TRIP_ID, 'motorbike', 90, plusMinutes(1.5));
    const result = await service.evaluate(TRIP_ID, 'motorbike', 80, plusMinutes(3));

    expect(result).not.toBeNull();
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tripId: TRIP_ID,
        declaredVehicleType: 'motorbike',
        observedBehaviorSummary: expect.stringContaining('km/h trong 3 phút'),
      }),
    );
  });

  it('does not warn again for the same episode once already warned', async () => {
    await service.evaluate(TRIP_ID, 'motorbike', 85, T0);
    await service.evaluate(TRIP_ID, 'motorbike', 85, plusMinutes(3));
    repo.save.mockClear();

    const result = await service.evaluate(TRIP_ID, 'motorbike', 85, plusMinutes(4));

    expect(result).toBeNull();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('resets the episode when speed drops back to/under threshold, requiring a fresh 3 minutes', async () => {
    await service.evaluate(TRIP_ID, 'motorbike', 85, T0);
    await service.evaluate(TRIP_ID, 'motorbike', 60, plusMinutes(2)); // at threshold — resets
    const stillWithinOldWindow = await service.evaluate(TRIP_ID, 'motorbike', 85, plusMinutes(2.5));

    expect(stillWithinOldWindow).toBeNull();

    const afterFreshThreeMinutes = await service.evaluate(TRIP_ID, 'motorbike', 85, plusMinutes(5.5));
    expect(afterFreshThreeMinutes).not.toBeNull();
  });

  it('uses neutral language with no forbidden terms in the summary', async () => {
    await service.evaluate(TRIP_ID, 'motorbike', 85, T0);
    await service.evaluate(TRIP_ID, 'motorbike', 85, plusMinutes(3));

    const summary = (repo.create as jest.Mock).mock.calls[0][0].observedBehaviorSummary as string;
    expect(summary).not.toMatch(/gian lận|phạt nguội/i);
  });
});
