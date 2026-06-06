import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { Brand } from '../brands/entities/brand.entity';
import { CreateVehicleModelDto } from './dto/create-vehicle-model.dto';
import { UpdateVehicleModelDto } from './dto/update-vehicle-model.dto';
import { VehicleModel } from './entities/vehicle-model.entity';
import { ModelsController } from './models.controller';
import { ModelsQueryService } from './models-query.service';
import { ModelsRegistrationService } from './models-registration.service';

/**
 * Controller tests verify that each route handler delegates correctly to the
 * appropriate service with the correct arguments.
 * Business-rule outcomes (exceptions, uniqueness checks) belong in the
 * service specs. Guard behaviour is validated by e2e tests.
 */

type MockModelsQueryService = jest.Mocked<
  Pick<ModelsQueryService, 'findAllVehicleModels' | 'findOneVehicleModel'>
>;

type MockModelsRegistrationService = jest.Mocked<
  Pick<
    ModelsRegistrationService,
    'createVehicleModel' | 'updateVehicleModel' | 'removeVehicleModel'
  >
>;

function buildMockModelsQueryService(): MockModelsQueryService {
  return {
    findAllVehicleModels: jest.fn(),
    findOneVehicleModel: jest.fn(),
  };
}

function buildMockModelsRegistrationService(): MockModelsRegistrationService {
  return {
    createVehicleModel: jest.fn(),
    updateVehicleModel: jest.fn(),
    removeVehicleModel: jest.fn(),
  };
}

function buildVehicleModelStub(
  overrides: Partial<VehicleModel> = {},
): VehicleModel {
  const brand = new Brand();
  brand.id = 'brand-uuid-001';
  brand.name = 'Toyota';
  brand.createdBy = null;

  const model = new VehicleModel();
  model.id = 'model-uuid-001';
  model.name = 'Corolla';
  model.brand = brand;
  model.createdBy = null;
  return Object.assign(model, overrides);
}

const VALID_BRAND_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

describe('ModelsController', () => {
  let modelsController: ModelsController;
  let mockModelsQueryService: MockModelsQueryService;
  let mockModelsRegistrationService: MockModelsRegistrationService;

  beforeEach(async () => {
    mockModelsQueryService = buildMockModelsQueryService();
    mockModelsRegistrationService = buildMockModelsRegistrationService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModelsController],
      providers: [
        { provide: ModelsQueryService, useValue: mockModelsQueryService },
        {
          provide: ModelsRegistrationService,
          useValue: mockModelsRegistrationService,
        },
      ],
    })
      .overrideGuard(jest.fn())
      .useValue({ canActivate: () => true })
      .compile();

    modelsController = module.get<ModelsController>(ModelsController);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── createVehicleModel ────────────────────────────────────────────────────

  describe('createVehicleModel', () => {
    it('should delegate to ModelsRegistrationService.createVehicleModel with userId from token', async () => {
      const dto: CreateVehicleModelDto = {
        name: 'Corolla',
        brandId: VALID_BRAND_UUID,
      };
      const model = buildVehicleModelStub({ createdBy: 'user-uuid-actor' });
      const mockReq = { user: { sub: 'user-uuid-actor' } } as AuthenticatedRequest;
      mockModelsRegistrationService.createVehicleModel.mockResolvedValue(model);

      const result = await modelsController.createVehicleModel(dto, mockReq);

      expect(
        mockModelsRegistrationService.createVehicleModel,
      ).toHaveBeenCalledWith(dto, 'user-uuid-actor');
      expect(result).toEqual(model);
    });
  });

  // ─── findAllVehicleModels ──────────────────────────────────────────────────

  describe('findAllVehicleModels', () => {
    it('should delegate to ModelsQueryService.findAllVehicleModels', async () => {
      const models = [buildVehicleModelStub()];
      mockModelsQueryService.findAllVehicleModels.mockResolvedValue(models);

      const result = await modelsController.findAllVehicleModels();

      expect(
        mockModelsQueryService.findAllVehicleModels,
      ).toHaveBeenCalledTimes(1);
      expect(result).toEqual(models);
    });
  });

  // ─── findOneVehicleModel ───────────────────────────────────────────────────

  describe('findOneVehicleModel', () => {
    it('should delegate to ModelsQueryService.findOneVehicleModel with the route id', async () => {
      const model = buildVehicleModelStub();
      mockModelsQueryService.findOneVehicleModel.mockResolvedValue(model);

      const result = await modelsController.findOneVehicleModel('model-uuid-001');

      expect(
        mockModelsQueryService.findOneVehicleModel,
      ).toHaveBeenCalledWith('model-uuid-001');
      expect(result).toEqual(model);
    });
  });

  // ─── updateVehicleModel ────────────────────────────────────────────────────

  describe('updateVehicleModel', () => {
    it('should delegate to ModelsRegistrationService.updateVehicleModel with id, dto, and userId from token', async () => {
      const dto: UpdateVehicleModelDto = { name: 'Yaris' };
      const updatedModel = buildVehicleModelStub({ name: 'Yaris' });
      const mockReq = { user: { sub: 'user-uuid-actor' } } as AuthenticatedRequest;
      mockModelsRegistrationService.updateVehicleModel.mockResolvedValue(updatedModel);

      const result = await modelsController.updateVehicleModel('model-uuid-001', dto, mockReq);

      expect(mockModelsRegistrationService.updateVehicleModel).toHaveBeenCalledWith(
        'model-uuid-001',
        dto,
        'user-uuid-actor',
      );
      expect(result).toEqual(updatedModel);
    });
  });

  // ─── removeVehicleModel ────────────────────────────────────────────────────

  describe('removeVehicleModel', () => {
    it('should delegate to ModelsRegistrationService.removeVehicleModel with id and userId from token', async () => {
      const mockReq = { user: { sub: 'user-uuid-actor' } } as AuthenticatedRequest;
      mockModelsRegistrationService.removeVehicleModel.mockResolvedValue(undefined);

      await modelsController.removeVehicleModel('model-uuid-001', mockReq);

      expect(mockModelsRegistrationService.removeVehicleModel).toHaveBeenCalledWith(
        'model-uuid-001',
        'user-uuid-actor',
      );
    });
  });
});
