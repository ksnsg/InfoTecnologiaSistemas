import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Brand } from '../brands/entities/brand.entity';
import { VehicleModel } from './entities/vehicle-model.entity';
import { ModelsQueryService } from './models-query.service';

type MockVehicleModelRepository = jest.Mocked<
  Pick<Repository<VehicleModel>, 'find' | 'findOne'>
>;

function buildMockVehicleModelRepository(): MockVehicleModelRepository {
  return { find: jest.fn(), findOne: jest.fn() };
}

function buildBrandStub(): Brand {
  const brand = new Brand();
  brand.id = 'brand-uuid-001';
  brand.name = 'Toyota';
  brand.createdBy = null;
  return brand;
}

function buildVehicleModelStub(overrides: Partial<VehicleModel> = {}): VehicleModel {
  const model = new VehicleModel();
  model.id = 'model-uuid-001';
  model.name = 'Corolla';
  model.brand = buildBrandStub();
  model.createdBy = null;
  return Object.assign(model, overrides);
}

describe('ModelsQueryService', () => {
  let modelsQueryService: ModelsQueryService;
  let mockVehicleModelRepository: MockVehicleModelRepository;

  beforeEach(async () => {
    mockVehicleModelRepository = buildMockVehicleModelRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModelsQueryService,
        {
          provide: getRepositoryToken(VehicleModel),
          useValue: mockVehicleModelRepository,
        },
      ],
    }).compile();

    modelsQueryService = module.get<ModelsQueryService>(ModelsQueryService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── findAllVehicleModels ──────────────────────────────────────────────────

  describe('findAllVehicleModels', () => {
    it('should return all models with the brand relation loaded', async () => {
      const models = [
        buildVehicleModelStub(),
        buildVehicleModelStub({ id: 'model-uuid-002', name: 'Hilux' }),
      ];
      mockVehicleModelRepository.find.mockResolvedValue(models);

      const result = await modelsQueryService.findAllVehicleModels();

      expect(mockVehicleModelRepository.find).toHaveBeenCalledWith({
        relations: ['brand'],
      });
      expect(result).toHaveLength(2);
      expect(result[0].brand).toBeDefined();
    });

    it('should return an empty array when no models exist', async () => {
      mockVehicleModelRepository.find.mockResolvedValue([]);

      const result = await modelsQueryService.findAllVehicleModels();

      expect(result).toEqual([]);
    });
  });

  // ─── findOneVehicleModel ───────────────────────────────────────────────────

  describe('findOneVehicleModel', () => {
    it('should return the model with the brand relation when it exists', async () => {
      const model = buildVehicleModelStub();
      mockVehicleModelRepository.findOne.mockResolvedValue(model);

      const result = await modelsQueryService.findOneVehicleModel(
        'model-uuid-001',
      );

      expect(mockVehicleModelRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'model-uuid-001' },
        relations: ['brand'],
      });
      expect(result.brand).toBeDefined();
      expect(result).toEqual(model);
    });

    it('should throw NotFoundException when the model does not exist', async () => {
      mockVehicleModelRepository.findOne.mockResolvedValue(null);

      await expect(
        modelsQueryService.findOneVehicleModel('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
