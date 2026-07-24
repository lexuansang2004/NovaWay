import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TerrainWarningsService } from './terrain-warnings.service';
import { TERRAIN_WARNING_SOURCE, TerrainWarningSource } from './terrain-warning-source.interface';

describe('TerrainWarningsService', () => {
  let service: TerrainWarningsService;
  let source: jest.Mocked<TerrainWarningSource>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TerrainWarningsService,
        { provide: TERRAIN_WARNING_SOURCE, useValue: { getWarningsInBBox: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();

    service = module.get(TerrainWarningsService);
    source = module.get(TERRAIN_WARNING_SOURCE);
  });

  it('throws VALIDATION_ERROR when bbox is missing', async () => {
    await expect(service.getWarningsInBBox(undefined)).rejects.toThrow(BadRequestException);
  });

  it('throws VALIDATION_ERROR when bbox does not have 4 numbers', async () => {
    await expect(service.getWarningsInBBox('10.7,106.7,10.8')).rejects.toThrow(BadRequestException);
  });

  it('throws VALIDATION_ERROR when bbox contains non-numeric parts', async () => {
    await expect(service.getWarningsInBBox('10.7,abc,10.8,106.8')).rejects.toThrow(BadRequestException);
  });

  it('throws VALIDATION_ERROR when latitude is out of range', async () => {
    await expect(service.getWarningsInBBox('95,106.7,10.8,106.8')).rejects.toThrow(BadRequestException);
  });

  it('throws VALIDATION_ERROR when longitude is out of range', async () => {
    await expect(service.getWarningsInBBox('10.7,-200,10.8,106.8')).rejects.toThrow(BadRequestException);
  });

  it('normalizes the two corners into southWest/northEast before querying the source', async () => {
    // Client sends the corners "backwards" (lat1 > lat2, lng1 > lng2) —
    // must still resolve to the correct min/max envelope.
    await service.getWarningsInBBox('10.8,106.8,10.7,106.7');

    expect(source.getWarningsInBBox).toHaveBeenCalledWith({
      southWest: { lat: 10.7, lng: 106.7 },
      northEast: { lat: 10.8, lng: 106.8 },
    });
  });

  it('returns whatever the source resolves', async () => {
    const warnings = [{ id: 'w1', location: { lat: 10.7, lng: 106.7 }, severity: 'danger' as const, description: 'x' }];
    source.getWarningsInBBox.mockResolvedValue(warnings);

    const result = await service.getWarningsInBBox('10.7,106.7,10.8,106.8');

    expect(result).toEqual(warnings);
  });
});
