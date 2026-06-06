import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Brand } from '../brands/entities/brand.entity';
import { VehicleModel } from '../models/entities/vehicle-model.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from './entities/vehicle.entity';
import { VehiclesController } from './vehicles.controller';
import { VehiclesQueryService } from './vehicles-query.service';
import { VehiclesRegistrationService } from './vehicles-registration.service';

/**
 * Controller tests verify that each route handler delegates to the correct
 * service with the correct arguments. Business-rule outcomes belong in the
 * service specs; guard behaviour is validated by e2e tests.
 */

type MockVehiclesQueryService = jest.Mocked<
  Pick<VehiclesQueryService, 'findAllVehicles' | 'findOneVehicle'>
>;

type MockVehiclesRegistrationService = jest.Mocked<
  Pick<
    VehiclesRegistrationService,
    'createVehicle' | 'updateVehicle' | 'removeVehicle'
  >
>;

function buildMockVehiclesQueryService(): MockVehiclesQueryService {
  return { findAllVehicles: jest.fn(), findOneVehicle: jest.fn() };
}

function buildMockVehiclesRegistrationService(): MockVehiclesRegistrationService {
  return {
    createVehicle: jest.fn(),
    updateVehicle: jest.fn(),
    removeVehicle: jest.fn(),
  };
}

function buildVehicleStub(overrides: Partial<Vehicle> = {}): Vehicle {
  const brand = new Brand();
  brand.id = 'brand-uuid-honda';
  brand.name = 'Honda';
  brand.createdBy = null;

  const model = new VehicleModel();
  model.id = 'model-uuid-civic';
  model.name = 'Civic';
  model.brand = brand;
  model.createdBy = null;

  const vehicle = new Vehicle();
  vehicle.id = 'vehicle-uuid-001';
  vehicle.licensePlate = 'ABC1D23';
  vehicle.chassis = '9BWZZZ377VT004251';
  vehicle.renavam = '01234567890';
  vehicle.year = 2022;
  vehicle.vehicleModel = model;
  vehicle.createdBy = null;
  return Object.assign(vehicle, overrides);
}

const VALID_MODEL_UUID = 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f';
const ACTOR_USER_ID = 'user-uuid-actor';

/** Minimal AuthenticatedRequest stub for unit-level controller tests. */
const mockAuthReq = {
  user: { sub: ACTOR_USER_ID, nickname: 'test_user' },
} as AuthenticatedRequest;

describe('VehiclesController', () => {
  let vehiclesController: VehiclesController;
  let mockVehiclesQueryService: MockVehiclesQueryService;
  let mockVehiclesRegistrationService: MockVehiclesRegistrationService;

  beforeEach(async () => {
    mockVehiclesQueryService = buildMockVehiclesQueryService();
    mockVehiclesRegistrationService = buildMockVehiclesRegistrationService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehiclesController],
      providers: [
        { provide: VehiclesQueryService, useValue: mockVehiclesQueryService },
        {
          provide: VehiclesRegistrationService,
          useValue: mockVehiclesRegistrationService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    vehiclesController = module.get<VehiclesController>(VehiclesController);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── createVehicle ─────────────────────────────────────────────────────────

  describe('createVehicle', () => {
    it('should delegate to VehiclesRegistrationService.createVehicle with dto and userId', async () => {
      const dto: CreateVehicleDto = {
        licensePlate: 'ABC1D23',
        chassis: '9BWZZZ377VT004251',
        renavam: '01234567890',
        year: 2022,
        modelId: VALID_MODEL_UUID,
      };
      const vehicle = buildVehicleStub();
      mockVehiclesRegistrationService.createVehicle.mockResolvedValue(vehicle);

      const result = await vehiclesController.createVehicle(dto, mockAuthReq);

      expect(
        mockVehiclesRegistrationService.createVehicle,
      ).toHaveBeenCalledWith(dto, ACTOR_USER_ID);
      expect(result).toEqual(vehicle);
    });
  });

  // ─── findAllVehicles ───────────────────────────────────────────────────────

  describe('findAllVehicles', () => {
    it('should delegate to VehiclesQueryService.findAllVehicles', async () => {
      const vehicles = [
        buildVehicleStub(),
        buildVehicleStub({ id: 'vehicle-uuid-002', licensePlate: 'DEF5G67' }),
      ];
      mockVehiclesQueryService.findAllVehicles.mockResolvedValue(vehicles);

      const result = await vehiclesController.findAllVehicles();

      expect(
        mockVehiclesQueryService.findAllVehicles,
      ).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
    });
  });

  // ─── findOneVehicle ────────────────────────────────────────────────────────

  describe('findOneVehicle', () => {
    it('should delegate to VehiclesQueryService.findOneVehicle with the route id', async () => {
      const vehicle = buildVehicleStub();
      mockVehiclesQueryService.findOneVehicle.mockResolvedValue(vehicle);

      const result = await vehiclesController.findOneVehicle('vehicle-uuid-001');

      expect(mockVehiclesQueryService.findOneVehicle).toHaveBeenCalledWith(
        'vehicle-uuid-001',
      );
      expect(result).toEqual(vehicle);
    });
  });

  // ─── updateVehicle ─────────────────────────────────────────────────────────

  describe('updateVehicle', () => {
    it('should delegate to VehiclesRegistrationService.updateVehicle with id, dto, and userId', async () => {
      const dto: UpdateVehicleDto = {
        licensePlate: 'XYZ9W87',
        year: 2023,
      };
      const updatedVehicle = buildVehicleStub({
        licensePlate: 'XYZ9W87',
        year: 2023,
      });
      mockVehiclesRegistrationService.updateVehicle.mockResolvedValue(
        updatedVehicle,
      );

      const result = await vehiclesController.updateVehicle(
        'vehicle-uuid-001',
        dto,
        mockAuthReq,
      );

      expect(
        mockVehiclesRegistrationService.updateVehicle,
      ).toHaveBeenCalledWith('vehicle-uuid-001', dto, ACTOR_USER_ID);
      expect(result.licensePlate).toBe('XYZ9W87');
    });
  });

  // ─── removeVehicle ─────────────────────────────────────────────────────────

  describe('removeVehicle', () => {
    it('should delegate to VehiclesRegistrationService.removeVehicle with id and userId', async () => {
      mockVehiclesRegistrationService.removeVehicle.mockResolvedValue(
        undefined,
      );

      await vehiclesController.removeVehicle('vehicle-uuid-001', mockAuthReq);

      expect(
        mockVehiclesRegistrationService.removeVehicle,
      ).toHaveBeenCalledWith('vehicle-uuid-001', ACTOR_USER_ID);
    });
  });
});
