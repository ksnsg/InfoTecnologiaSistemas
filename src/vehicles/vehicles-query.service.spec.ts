import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Cache } from 'cache-manager';
import type { Repository } from 'typeorm';
import { Brand } from '../brands/entities/brand.entity';
import { VehicleModel } from '../models/entities/vehicle-model.entity';
import { Vehicle } from './entities/vehicle.entity';
import {
  CACHE_KEY_VEHICLES_ALL,
  vehicleCacheKey,
} from './vehicle-cache-keys.constants';
import { VehiclesQueryService } from './vehicles-query.service';

type MockVehicleRepository = jest.Mocked<
  Pick<Repository<Vehicle>, 'find' | 'findOne'>
>;
type MockCacheManager = jest.Mocked<Pick<Cache, 'get' | 'set'>>;

function buildMockVehicleRepository(): MockVehicleRepository {
  return { find: jest.fn(), findOne: jest.fn() };
}

function buildMockCacheManager(): MockCacheManager {
  return { get: jest.fn(), set: jest.fn() };
}

function buildBrandStub(): Brand {
  const brand = new Brand();
  brand.id = 'brand-uuid-toyota';
  brand.name = 'Toyota';
  brand.createdBy = null;
  return brand;
}

function buildVehicleModelStub(): VehicleModel {
  const model = new VehicleModel();
  model.id = 'model-uuid-corolla';
  model.name = 'Corolla';
  model.brand = buildBrandStub();
  model.createdBy = null;
  return model;
}

function buildVehicleStub(overrides: Partial<Vehicle> = {}): Vehicle {
  const vehicle = new Vehicle();
  vehicle.id = 'vehicle-uuid-001';
  vehicle.licensePlate = 'ABC1D23';
  vehicle.chassis = '9BWZZZ377VT004251';
  vehicle.renavam = '01234567890';
  vehicle.year = 2020;
  vehicle.vehicleModel = buildVehicleModelStub();
  vehicle.createdBy = null;
  return Object.assign(vehicle, overrides);
}

describe('VehiclesQueryService', () => {
  let vehiclesQueryService: VehiclesQueryService;
  let mockVehicleRepository: MockVehicleRepository;
  let mockCacheManager: MockCacheManager;

  beforeEach(async () => {
    mockVehicleRepository = buildMockVehicleRepository();
    mockCacheManager = buildMockCacheManager();
    mockCacheManager.set.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesQueryService,
        {
          provide: getRepositoryToken(Vehicle),
          useValue: mockVehicleRepository,
        },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    vehiclesQueryService =
      module.get<VehiclesQueryService>(VehiclesQueryService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── findAllVehicles ───────────────────────────────────────────────────────

  describe('findAllVehicles', () => {
    it('should return cached vehicles and skip the database on a cache HIT', async () => {
      const cachedVehicles = [buildVehicleStub()];
      mockCacheManager.get.mockResolvedValue(cachedVehicles);

      const result = await vehiclesQueryService.findAllVehicles();

      expect(mockCacheManager.get).toHaveBeenCalledWith(CACHE_KEY_VEHICLES_ALL);
      expect(mockVehicleRepository.find).not.toHaveBeenCalled();
      expect(mockCacheManager.set).not.toHaveBeenCalled();
      expect(result).toEqual(cachedVehicles);
    });

    it('should query the DB, populate the cache, and return data on a cache MISS', async () => {
      const dbVehicles = [
        buildVehicleStub(),
        buildVehicleStub({ id: 'vehicle-uuid-002', licensePlate: 'DEF5G67' }),
      ];
      mockCacheManager.get.mockResolvedValue(undefined);
      mockVehicleRepository.find.mockResolvedValue(dbVehicles);

      const result = await vehiclesQueryService.findAllVehicles();

      expect(mockCacheManager.get).toHaveBeenCalledWith(CACHE_KEY_VEHICLES_ALL);
      expect(mockVehicleRepository.find).toHaveBeenCalledWith({
        relations: ['vehicleModel', 'vehicleModel.brand'],
      });
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        CACHE_KEY_VEHICLES_ALL,
        dbVehicles,
        expect.any(Number),
      );
      expect(result).toHaveLength(2);
      expect(result[0].vehicleModel.brand.name).toBe('Toyota');
    });

    it('should cache and return an empty array when no vehicles exist in the DB', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);
      mockVehicleRepository.find.mockResolvedValue([]);

      const result = await vehiclesQueryService.findAllVehicles();

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        CACHE_KEY_VEHICLES_ALL,
        [],
        expect.any(Number),
      );
      expect(result).toEqual([]);
    });
  });

  // ─── findOneVehicle ────────────────────────────────────────────────────────

  describe('findOneVehicle', () => {
    it('should return the cached Toyota Corolla and skip the DB on a cache HIT', async () => {
      const cachedVehicle = buildVehicleStub();
      mockCacheManager.get.mockResolvedValue(cachedVehicle);

      const result = await vehiclesQueryService.findOneVehicle('vehicle-uuid-001');

      expect(mockCacheManager.get).toHaveBeenCalledWith(
        vehicleCacheKey('vehicle-uuid-001'),
      );
      expect(mockVehicleRepository.findOne).not.toHaveBeenCalled();
      expect(mockCacheManager.set).not.toHaveBeenCalled();
      expect(result).toEqual(cachedVehicle);
    });

    it('should query the DB, populate the cache, and return the vehicle on a cache MISS', async () => {
      const vehicle = buildVehicleStub();
      mockCacheManager.get.mockResolvedValue(undefined);
      mockVehicleRepository.findOne.mockResolvedValue(vehicle);

      const result = await vehiclesQueryService.findOneVehicle('vehicle-uuid-001');

      expect(mockCacheManager.get).toHaveBeenCalledWith(
        vehicleCacheKey('vehicle-uuid-001'),
      );
      expect(mockVehicleRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'vehicle-uuid-001' },
        relations: ['vehicleModel', 'vehicleModel.brand'],
      });
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        vehicleCacheKey('vehicle-uuid-001'),
        vehicle,
        expect.any(Number),
      );
      expect(result.vehicleModel.name).toBe('Corolla');
    });

    it('should throw NotFoundException and NOT populate the cache when the vehicle is missing', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);
      mockVehicleRepository.findOne.mockResolvedValue(null);

      await expect(
        vehiclesQueryService.findOneVehicle('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });
  });
});
