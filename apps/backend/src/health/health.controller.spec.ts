import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let dataSource: jest.Mocked<Pick<DataSource, 'query'>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: getDataSourceToken(), useValue: { query: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('abc1234') } },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    dataSource = module.get(getDataSourceToken());
  });

  it('returns ok status with an ISO 8601 timestamp when the database is reachable', async () => {
    dataSource.query.mockResolvedValue([{ '?column?': 1 }]);

    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.database).toEqual({ status: 'ok' });
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('returns degraded status when the database query fails', async () => {
    dataSource.query.mockRejectedValue(new Error('connection refused'));

    const result = await controller.check();

    expect(result.status).toBe('degraded');
    expect(result.database).toEqual({ status: 'error' });
  });

  it('returns the commit_sha from RAILWAY_GIT_COMMIT_SHA', async () => {
    dataSource.query.mockResolvedValue([{ '?column?': 1 }]);

    const result = await controller.check();

    expect(result.commit_sha).toBe('abc1234');
  });
});
