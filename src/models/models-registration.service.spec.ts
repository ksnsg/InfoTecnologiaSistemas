import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Brand } from '../brands/entities/brand.entity';
import { BrandsQueryService } from '../brands/brands-query.service';
import { AuditMessagePublisherService } from '../messaging/audit-message-publisher.service';
import { CreateVehicleModelDto } from './dto/create-vehicle-model.dto';
import { UpdateVehicleModelDto } from './dto/update-vehicle-model.dto';
import { VehicleModel } from './entities/vehicle-model.entity';
import { ModelsRegistrationService } from './models-registration.service';

type MockVehicleModelRepository = jest.Mocked<
  Pick<Repository<VehicleModel>, 'findOne' | 'create' | 'save' | 'remove'>
>;

type MockBrandsQueryService = jest.Mocked<
  Pick<BrandsQueryService, 'findOneBrand'>
>;

type MockAuditPublisher = jest.Mocked<
  Pick<AuditMessagePublisherService, 'publishAuditEvent'>
>;

function buildMockVehicleModelRepository(): MockVehicleModelRepository {
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };
}

function buildMockBrandsQueryService(): MockBrandsQueryService {
  return { findOneBrand: jest.fn() };
}

function buildMockAuditPublisher(): MockAuditPublisher {
  return { publishAuditEvent: jest.fn() };
}

function buildBrandStub(overrides: Partial<Brand> = {}): Brand {
  const brand = new Brand();
  brand.id = 'brand-uuid-001';
  brand.name = 'Toyota';
  brand.createdBy = null;
  return Object.assign(brand, overrides);
}

function buildVehicleModelStub(overrides: Partial<VehicleModel> = {}): VehicleModel {
  const brand = buildBrandStub();
  const model = new VehicleModel();
  model.id = 'model-uuid-001';
  model.name = 'Corolla';
  model.brand = brand;
  model.createdBy = null;
  return Object.assign(model, overrides);
}

const VALID_BRAND_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const ACTOR_USER_ID = 'user-uuid-actor';

describe('ModelsRegistrationService', () => {
  let modelsRegistrationService: ModelsRegistrationService;
  let mockVehicleModelRepository: MockVehicleModelRepository;
  let mockBrandsQueryService: MockBrandsQueryService;
  let mockAuditPublisher: MockAuditPublisher;

  beforeEach(async () => {
    mockVehicleModelRepository = buildMockVehicleModelRepository();
    mockBrandsQueryService = buildMockBrandsQueryService();
    mockAuditPublisher = buildMockAuditPublisher();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModelsRegistrationService,
        {
          provide: getRepositoryToken(VehicleModel),
          useValue: mockVehicleModelRepository,
        },
        { provide: BrandsQueryService, useValue: mockBrandsQueryService },
        { provide: AuditMessagePublisherService, useValue: mockAuditPublisher },
      ],
    }).compile();

    modelsRegistrationService = module.get<ModelsRegistrationService>(
      ModelsRegistrationService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  // ─── createVehicleModel ────────────────────────────────────────────────────

  describe('createVehicleModel', () => {
    const dto: CreateVehicleModelDto = {
      name: 'Corolla',
      brandId: VALID_BRAND_UUID,
    };

    it('should persist the model, set createdBy, and publish a CREATE audit event', async () => {
      const brand = buildBrandStub({ id: VALID_BRAND_UUID });
      const savedModel = buildVehicleModelStub({ brand, createdBy: ACTOR_USER_ID });
      mockBrandsQueryService.findOneBrand.mockResolvedValue(brand);
      mockVehicleModelRepository.findOne.mockResolvedValue(null);
      mockVehicleModelRepository.create.mockReturnValue(savedModel);
      mockVehicleModelRepository.save.mockResolvedValue(savedModel);

      const result = await modelsRegistrationService.createVehicleModel(dto, ACTOR_USER_ID);

      expect(mockVehicleModelRepository.create).toHaveBeenCalledWith({
        name: dto.name,
        brand,
        createdBy: ACTOR_USER_ID,
      });
      expect(result).toEqual(savedModel);
      expect(mockAuditPublisher.publishAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          resourceType: 'MODEL',
          resourceId: savedModel.id,
          userId: ACTOR_USER_ID,
        }),
      );
    });

    it('should throw NotFoundException when the referenced brand does not exist', async () => {
      mockBrandsQueryService.findOneBrand.mockRejectedValue(
        new NotFoundException(`Brand with id "${VALID_BRAND_UUID}" was not found.`),
      );

      await expect(
        modelsRegistrationService.createVehicleModel(dto, ACTOR_USER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(mockVehicleModelRepository.create).not.toHaveBeenCalled();
      expect(mockAuditPublisher.publishAuditEvent).not.toHaveBeenCalled();
    });

    it('should throw ConflictException and NOT publish audit when model name already exists under the brand', async () => {
      const brand = buildBrandStub({ id: VALID_BRAND_UUID });
      mockBrandsQueryService.findOneBrand.mockResolvedValue(brand);
      mockVehicleModelRepository.findOne.mockResolvedValue(buildVehicleModelStub());

      await expect(
        modelsRegistrationService.createVehicleModel(dto, ACTOR_USER_ID),
      ).rejects.toThrow(ConflictException);
      expect(mockVehicleModelRepository.save).not.toHaveBeenCalled();
      expect(mockAuditPublisher.publishAuditEvent).not.toHaveBeenCalled();
    });
  });

  // ─── updateVehicleModel ────────────────────────────────────────────────────

  describe('updateVehicleModel', () => {
    it('should update only the name, persist, and publish an UPDATE audit event', async () => {
      const dto: UpdateVehicleModelDto = { name: 'Yaris' };
      const existingModel = buildVehicleModelStub();
      mockVehicleModelRepository.findOne.mockResolvedValue(existingModel);
      mockVehicleModelRepository.save.mockResolvedValue({
        ...existingModel,
        name: 'Yaris',
      } as VehicleModel);

      const result = await modelsRegistrationService.updateVehicleModel(
        'model-uuid-001',
        dto,
        ACTOR_USER_ID,
      );

      expect(mockBrandsQueryService.findOneBrand).not.toHaveBeenCalled();
      expect(mockVehicleModelRepository.save).toHaveBeenCalled();
      expect(result.name).toBe('Yaris');
      expect(mockAuditPublisher.publishAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          resourceType: 'MODEL',
          resourceId: 'model-uuid-001',
          userId: ACTOR_USER_ID,
        }),
      );
    });

    it('should re-assign the brand when brandId is present in the dto', async () => {
      const newBrandUuid = 'f1e2d3c4-b5a6-4978-8765-4321abcdef12';
      const dto: UpdateVehicleModelDto = { brandId: newBrandUuid };
      const newBrand = buildBrandStub({ id: newBrandUuid, name: 'Honda' });
      const existingModel = buildVehicleModelStub();
      mockVehicleModelRepository.findOne.mockResolvedValue(existingModel);
      mockBrandsQueryService.findOneBrand.mockResolvedValue(newBrand);
      mockVehicleModelRepository.save.mockResolvedValue({
        ...existingModel,
        brand: newBrand,
      } as VehicleModel);

      const result = await modelsRegistrationService.updateVehicleModel(
        'model-uuid-001',
        dto,
        ACTOR_USER_ID,
      );

      expect(mockBrandsQueryService.findOneBrand).toHaveBeenCalledWith(newBrandUuid);
      expect(result.brand.name).toBe('Honda');
    });

    it('should throw NotFoundException and NOT publish audit when the model does not exist', async () => {
      mockVehicleModelRepository.findOne.mockResolvedValue(null);

      await expect(
        modelsRegistrationService.updateVehicleModel('non-existent-id', { name: 'X' }, ACTOR_USER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(mockVehicleModelRepository.save).not.toHaveBeenCalled();
      expect(mockAuditPublisher.publishAuditEvent).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the new brand does not exist', async () => {
      const dto: UpdateVehicleModelDto = { brandId: VALID_BRAND_UUID };
      mockVehicleModelRepository.findOne.mockResolvedValue(buildVehicleModelStub());
      mockBrandsQueryService.findOneBrand.mockRejectedValue(
        new NotFoundException('Brand not found.'),
      );

      await expect(
        modelsRegistrationService.updateVehicleModel('model-uuid-001', dto, ACTOR_USER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(mockVehicleModelRepository.save).not.toHaveBeenCalled();
    });
  });

  // ─── removeVehicleModel ────────────────────────────────────────────────────

  describe('removeVehicleModel', () => {
    it('should remove the model and publish a DELETE audit event', async () => {
      const model = buildVehicleModelStub();
      mockVehicleModelRepository.findOne.mockResolvedValue(model);
      mockVehicleModelRepository.remove.mockResolvedValue(model);

      await modelsRegistrationService.removeVehicleModel('model-uuid-001', ACTOR_USER_ID);

      expect(mockVehicleModelRepository.remove).toHaveBeenCalledWith(model);
      expect(mockAuditPublisher.publishAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE',
          resourceType: 'MODEL',
          resourceId: 'model-uuid-001',
          userId: ACTOR_USER_ID,
        }),
      );
    });

    it('should throw NotFoundException and NOT publish audit when the model does not exist', async () => {
      mockVehicleModelRepository.findOne.mockResolvedValue(null);

      await expect(
        modelsRegistrationService.removeVehicleModel('non-existent-id', ACTOR_USER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(mockVehicleModelRepository.remove).not.toHaveBeenCalled();
      expect(mockAuditPublisher.publishAuditEvent).not.toHaveBeenCalled();
    });
  });
});
