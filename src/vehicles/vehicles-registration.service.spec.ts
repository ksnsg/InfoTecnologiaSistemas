import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Brand } from '../brands/entities/brand.entity';
import { AuditMessagePublisherService } from '../messaging/audit-message-publisher.service';
import { VehicleModel } from '../models/entities/vehicle-model.entity';
import { ModelsQueryService } from '../models/models-query.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from './entities/vehicle.entity';
import { VehicleCacheInvalidationService } from './vehicle-cache-invalidation.service';
import { VehiclesRegistrationService } from './vehicles-registration.service';

type MockVehicleRepository = jest.Mocked<
  Pick<Repository<Vehicle>, 'findOne' | 'create' | 'save' | 'remove'>
>;
type MockModelsQueryService = jest.Mocked<
  Pick<ModelsQueryService, 'findOneVehicleModel'>
>;
type MockVehicleCacheInvalidationService = jest.Mocked<
  Pick<
    VehicleCacheInvalidationService,
    'invalidateVehiclesListCache' | 'invalidateAllVehicleCacheEntries'
  >
>;
type MockAuditMessagePublisherService = jest.Mocked<
  Pick<AuditMessagePublisherService, 'publishAuditEvent'>
>;

function buildMockVehicleRepository(): MockVehicleRepository {
  return { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), remove: jest.fn() };
}

function buildMockModelsQueryService(): MockModelsQueryService {
  return { findOneVehicleModel: jest.fn() };
}

function buildMockVehicleCacheInvalidationService(): MockVehicleCacheInvalidationService {
  return {
    invalidateVehiclesListCache: jest.fn().mockResolvedValue(undefined),
    invalidateAllVehicleCacheEntries: jest.fn().mockResolvedValue(undefined),
  };
}

function buildMockAuditMessagePublisherService(): MockAuditMessagePublisherService {
  return { publishAuditEvent: jest.fn() };
}

function buildBrandStub(): Brand {
  const brand = new Brand();
  brand.id = 'brand-uuid-honda';
  brand.name = 'Honda';
  brand.createdBy = null;
  return brand;
}

function buildVehicleModelStub(): VehicleModel {
  const model = new VehicleModel();
  model.id = 'model-uuid-civic';
  model.name = 'Civic';
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
  vehicle.year = 2021;
  vehicle.vehicleModel = buildVehicleModelStub();
  vehicle.createdBy = null;
  return Object.assign(vehicle, overrides);
}

const VALID_MODEL_UUID = 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f';
const ACTOR_USER_ID = 'user-uuid-actor';

describe('VehiclesRegistrationService', () => {
  let vehiclesRegistrationService: VehiclesRegistrationService;
  let mockVehicleRepository: MockVehicleRepository;
  let mockModelsQueryService: MockModelsQueryService;
  let mockVehicleCacheInvalidationService: MockVehicleCacheInvalidationService;
  let mockAuditMessagePublisherService: MockAuditMessagePublisherService;

  beforeEach(async () => {
    mockVehicleRepository = buildMockVehicleRepository();
    mockModelsQueryService = buildMockModelsQueryService();
    mockVehicleCacheInvalidationService =
      buildMockVehicleCacheInvalidationService();
    mockAuditMessagePublisherService = buildMockAuditMessagePublisherService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesRegistrationService,
        { provide: getRepositoryToken(Vehicle), useValue: mockVehicleRepository },
        { provide: ModelsQueryService, useValue: mockModelsQueryService },
        {
          provide: VehicleCacheInvalidationService,
          useValue: mockVehicleCacheInvalidationService,
        },
        {
          provide: AuditMessagePublisherService,
          useValue: mockAuditMessagePublisherService,
        },
      ],
    }).compile();

    vehiclesRegistrationService = module.get<VehiclesRegistrationService>(
      VehiclesRegistrationService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  // ─── createVehicle ─────────────────────────────────────────────────────────

  describe('createVehicle', () => {
    const dto: CreateVehicleDto = {
      licensePlate: 'ABC1D23',
      chassis: '9BWZZZ377VT004251',
      renavam: '01234567890',
      year: 2021,
      modelId: VALID_MODEL_UUID,
    };

    it('should persist the Honda Civic and invalidate the list cache on success', async () => {
      const vehicleModel = buildVehicleModelStub();
      const savedVehicle = buildVehicleStub();
      mockModelsQueryService.findOneVehicleModel.mockResolvedValue(vehicleModel);
      mockVehicleRepository.create.mockReturnValue(savedVehicle);
      mockVehicleRepository.save.mockResolvedValue(savedVehicle);

      const result = await vehiclesRegistrationService.createVehicle(dto, ACTOR_USER_ID);

      expect(mockVehicleRepository.save).toHaveBeenCalledWith(savedVehicle);
      expect(
        mockVehicleCacheInvalidationService.invalidateVehiclesListCache,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockVehicleCacheInvalidationService.invalidateAllVehicleCacheEntries,
      ).not.toHaveBeenCalled();
      expect(result).toEqual(savedVehicle);
    });

    it('should publish a CREATE audit event with the vehicle id and actor userId', async () => {
      const vehicleModel = buildVehicleModelStub();
      const savedVehicle = buildVehicleStub();
      mockModelsQueryService.findOneVehicleModel.mockResolvedValue(vehicleModel);
      mockVehicleRepository.create.mockReturnValue(savedVehicle);
      mockVehicleRepository.save.mockResolvedValue(savedVehicle);

      await vehiclesRegistrationService.createVehicle(dto, ACTOR_USER_ID);

      expect(
        mockAuditMessagePublisherService.publishAuditEvent,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockAuditMessagePublisherService.publishAuditEvent,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          resourceType: 'VEHICLE',
          resourceId: savedVehicle.id,
          userId: ACTOR_USER_ID,
        }),
      );
    });

    it('should NOT invalidate any cache or publish an audit event when the model does not exist', async () => {
      mockModelsQueryService.findOneVehicleModel.mockRejectedValue(
        new NotFoundException(`VehicleModel not found.`),
      );

      await expect(
        vehiclesRegistrationService.createVehicle(dto, ACTOR_USER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(
        mockVehicleCacheInvalidationService.invalidateVehiclesListCache,
      ).not.toHaveBeenCalled();
      expect(
        mockAuditMessagePublisherService.publishAuditEvent,
      ).not.toHaveBeenCalled();
    });
  });

  // ─── updateVehicle ─────────────────────────────────────────────────────────

  describe('updateVehicle', () => {
    it('should update the vehicle and invalidate both cache entries on success', async () => {
      const dto: UpdateVehicleDto = { licensePlate: 'XYZ9W87', year: 2022 };
      const existingVehicle = buildVehicleStub();
      mockVehicleRepository.findOne.mockResolvedValue(existingVehicle);
      mockVehicleRepository.save.mockResolvedValue({
        ...existingVehicle,
        licensePlate: 'XYZ9W87',
        year: 2022,
      } as Vehicle);

      await vehiclesRegistrationService.updateVehicle('vehicle-uuid-001', dto, ACTOR_USER_ID);

      expect(
        mockVehicleCacheInvalidationService.invalidateAllVehicleCacheEntries,
      ).toHaveBeenCalledWith('vehicle-uuid-001');
      expect(
        mockVehicleCacheInvalidationService.invalidateVehiclesListCache,
      ).not.toHaveBeenCalled();
    });

    it('should publish an UPDATE audit event with the vehicle id and actor userId', async () => {
      const dto: UpdateVehicleDto = { licensePlate: 'XYZ9W87' };
      const existingVehicle = buildVehicleStub();
      mockVehicleRepository.findOne.mockResolvedValue(existingVehicle);
      mockVehicleRepository.save.mockResolvedValue(existingVehicle);

      await vehiclesRegistrationService.updateVehicle('vehicle-uuid-001', dto, ACTOR_USER_ID);

      expect(
        mockAuditMessagePublisherService.publishAuditEvent,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockAuditMessagePublisherService.publishAuditEvent,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          resourceId: 'vehicle-uuid-001',
          userId: ACTOR_USER_ID,
        }),
      );
    });

    it('should re-assign the vehicleModel and invalidate cache when modelId is in the dto', async () => {
      const newModelUuid = 'd4c3b2a1-f6e5-4d7c-8b9a-0e1f2a3b4c5d';
      const dto: UpdateVehicleDto = { modelId: newModelUuid };
      const newModel = buildVehicleModelStub();
      newModel.id = newModelUuid;
      newModel.name = 'Corolla';
      mockVehicleRepository.findOne.mockResolvedValue(buildVehicleStub());
      mockModelsQueryService.findOneVehicleModel.mockResolvedValue(newModel);
      mockVehicleRepository.save.mockResolvedValue(buildVehicleStub());

      await vehiclesRegistrationService.updateVehicle('vehicle-uuid-001', dto, ACTOR_USER_ID);

      expect(mockModelsQueryService.findOneVehicleModel).toHaveBeenCalledWith(
        newModelUuid,
      );
      expect(
        mockVehicleCacheInvalidationService.invalidateAllVehicleCacheEntries,
      ).toHaveBeenCalledWith('vehicle-uuid-001');
    });

    it('should throw NotFoundException and NOT invalidate cache or publish when the vehicle is missing', async () => {
      mockVehicleRepository.findOne.mockResolvedValue(null);

      await expect(
        vehiclesRegistrationService.updateVehicle('non-existent-id', { licensePlate: 'ABC1D23' }, ACTOR_USER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(
        mockVehicleCacheInvalidationService.invalidateAllVehicleCacheEntries,
      ).not.toHaveBeenCalled();
      expect(
        mockAuditMessagePublisherService.publishAuditEvent,
      ).not.toHaveBeenCalled();
    });

    it('should NOT invalidate cache or publish when the new model does not exist', async () => {
      const dto: UpdateVehicleDto = { modelId: VALID_MODEL_UUID };
      mockVehicleRepository.findOne.mockResolvedValue(buildVehicleStub());
      mockModelsQueryService.findOneVehicleModel.mockRejectedValue(
        new NotFoundException('VehicleModel not found.'),
      );

      await expect(
        vehiclesRegistrationService.updateVehicle('vehicle-uuid-001', dto, ACTOR_USER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(
        mockVehicleCacheInvalidationService.invalidateAllVehicleCacheEntries,
      ).not.toHaveBeenCalled();
      expect(
        mockAuditMessagePublisherService.publishAuditEvent,
      ).not.toHaveBeenCalled();
    });
  });

  // ─── removeVehicle ─────────────────────────────────────────────────────────

  describe('removeVehicle', () => {
    it('should remove the vehicle and invalidate both cache entries on success', async () => {
      const vehicle = buildVehicleStub({ licensePlate: 'DEF5G67', year: 2020 });
      mockVehicleRepository.findOne.mockResolvedValue(vehicle);
      mockVehicleRepository.remove.mockResolvedValue(vehicle);

      await vehiclesRegistrationService.removeVehicle('vehicle-uuid-001', ACTOR_USER_ID);

      expect(mockVehicleRepository.remove).toHaveBeenCalledWith(vehicle);
      expect(
        mockVehicleCacheInvalidationService.invalidateAllVehicleCacheEntries,
      ).toHaveBeenCalledWith('vehicle-uuid-001');
    });

    it('should publish a DELETE audit event with the vehicle id and actor userId', async () => {
      const vehicle = buildVehicleStub();
      mockVehicleRepository.findOne.mockResolvedValue(vehicle);
      mockVehicleRepository.remove.mockResolvedValue(vehicle);

      await vehiclesRegistrationService.removeVehicle('vehicle-uuid-001', ACTOR_USER_ID);

      expect(
        mockAuditMessagePublisherService.publishAuditEvent,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockAuditMessagePublisherService.publishAuditEvent,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE',
          resourceId: 'vehicle-uuid-001',
          userId: ACTOR_USER_ID,
        }),
      );
    });

    it('should throw NotFoundException and NOT invalidate cache or publish when the vehicle is missing', async () => {
      mockVehicleRepository.findOne.mockResolvedValue(null);

      await expect(
        vehiclesRegistrationService.removeVehicle('non-existent-id', ACTOR_USER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(
        mockVehicleCacheInvalidationService.invalidateAllVehicleCacheEntries,
      ).not.toHaveBeenCalled();
      expect(mockVehicleRepository.remove).not.toHaveBeenCalled();
      expect(
        mockAuditMessagePublisherService.publishAuditEvent,
      ).not.toHaveBeenCalled();
    });
  });
});
