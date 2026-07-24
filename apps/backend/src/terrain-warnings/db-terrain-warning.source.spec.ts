import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { DbTerrainWarningSource } from './db-terrain-warning.source';

describe('DbTerrainWarningSource', () => {
  let source: DbTerrainWarningSource;
  let dataSource: jest.Mocked<Pick<DataSource, 'query'>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DbTerrainWarningSource, { provide: DataSource, useValue: { query: jest.fn() } }],
    }).compile();

    source = module.get(DbTerrainWarningSource);
    dataSource = module.get(DataSource);
  });

  it('queries with the bbox envelope in lng/lat order and maps rows to lat/lng numbers', async () => {
    (dataSource.query as jest.Mock).mockResolvedValue([
      { id: 'w1', lat: '10.75', lng: '106.70', severity: 'warning', description: 'Ổ gà' },
    ]);

    const result = await source.getWarningsInBBox({
      southWest: { lat: 10.7, lng: 106.6 },
      northEast: { lat: 10.8, lng: 106.8 },
    });

    expect(dataSource.query).toHaveBeenCalledWith(expect.stringContaining('ST_MakeEnvelope'), [
      106.6,
      10.7,
      106.8,
      10.8,
    ]);
    expect(result).toEqual([
      { id: 'w1', location: { lat: 10.75, lng: 106.7 }, severity: 'warning', description: 'Ổ gà' },
    ]);
  });

  it('returns an empty array when no rows match', async () => {
    (dataSource.query as jest.Mock).mockResolvedValue([]);

    const result = await source.getWarningsInBBox({
      southWest: { lat: 0, lng: 0 },
      northEast: { lat: 1, lng: 1 },
    });

    expect(result).toEqual([]);
  });
});
