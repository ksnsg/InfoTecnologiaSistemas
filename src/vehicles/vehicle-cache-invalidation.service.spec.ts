import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import type { Cache } from 'cache-manager';
import {
  CACHE_KEY_VEHICLES_ALL,
  vehicleCacheKey,
} from './vehicle-cache-keys.constants';
import { VehicleCacheInvalidationService } from './vehicle-cache-invalidation.service';

type MockCacheManager = jest.Mocked<Pick<Cache, 'del'>>;

function buildMockCacheManager(): MockCacheManager {
  return { del: jest.fn() };
}

describe('VehicleCacheInvalidationService', () => {
  let vehicleCacheInvalidationService: VehicleCacheInvalidationService;
  let mockCacheManager: MockCacheManager;

  beforeEach(async () => {
    mockCacheManager = buildMockCacheManager();
    mockCacheManager.del.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleCacheInvalidationService,
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    vehicleCacheInvalidationService =
      module.get<VehicleCacheInvalidationService>(VehicleCacheInvalidationService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('invalidateVehiclesListCache', () => {
    it('should delete the vehicles:all key', async () => {
      await vehicleCacheInvalidationService.invalidateVehiclesListCache();

      expect(mockCacheManager.del).toHaveBeenCalledWith(CACHE_KEY_VEHICLES_ALL);
      expect(mockCacheManager.del).toHaveBeenCalledTimes(1);
    });
  });

  describe('invalidateVehicleByIdCache', () => {
    it('should delete the vehicle:{id} key for the given id', async () => {
      await vehicleCacheInvalidationService.invalidateVehicleByIdCache(
        'vehicle-uuid-001',
      );

      expect(mockCacheManager.del).toHaveBeenCalledWith(
        vehicleCacheKey('vehicle-uuid-001'),
      );
      expect(mockCacheManager.del).toHaveBeenCalledTimes(1);
    });
  });

  describe('invalidateAllVehicleCacheEntries', () => {
    it('should delete both vehicles:all and vehicle:{id} in parallel', async () => {
      await vehicleCacheInvalidationService.invalidateAllVehicleCacheEntries(
        'vehicle-uuid-001',
      );

      expect(mockCacheManager.del).toHaveBeenCalledWith(CACHE_KEY_VEHICLES_ALL);
      expect(mockCacheManager.del).toHaveBeenCalledWith(
        vehicleCacheKey('vehicle-uuid-001'),
      );
      expect(mockCacheManager.del).toHaveBeenCalledTimes(2);
    });
  });
});
