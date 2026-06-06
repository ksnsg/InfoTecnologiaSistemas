import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { BrandsController } from './brands.controller';
import { BrandsQueryService } from './brands-query.service';
import { BrandsRegistrationService } from './brands-registration.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { Brand } from './entities/brand.entity';

/**
 * Controller tests verify delegation: each route handler calls exactly the
 * correct service method with the correct arguments. Business-rule outcomes
 * (exceptions, conflict checks) belong in the service specs, not here.
 *
 * JwtAuthGuard is applied via decorator metadata; its runtime behaviour is
 * validated by e2e tests. Testing NestJS decorator application internals
 * would couple the tests to the framework implementation.
 */

type MockBrandsQueryService = jest.Mocked<
  Pick<BrandsQueryService, 'findAllBrands' | 'findOneBrand'>
>;

type MockBrandsRegistrationService = jest.Mocked<
  Pick<
    BrandsRegistrationService,
    'createBrand' | 'updateBrand' | 'removeBrand'
  >
>;

function buildMockBrandsQueryService(): MockBrandsQueryService {
  return { findAllBrands: jest.fn(), findOneBrand: jest.fn() };
}

function buildMockBrandsRegistrationService(): MockBrandsRegistrationService {
  return {
    createBrand: jest.fn(),
    updateBrand: jest.fn(),
    removeBrand: jest.fn(),
  };
}

function buildBrandStub(overrides: Partial<Brand> = {}): Brand {
  const brand = new Brand();
  brand.id = 'brand-uuid-001';
  brand.name = 'Toyota';
  brand.createdBy = null;
  return Object.assign(brand, overrides);
}

describe('BrandsController', () => {
  let brandsController: BrandsController;
  let mockBrandsQueryService: MockBrandsQueryService;
  let mockBrandsRegistrationService: MockBrandsRegistrationService;

  beforeEach(async () => {
    mockBrandsQueryService = buildMockBrandsQueryService();
    mockBrandsRegistrationService = buildMockBrandsRegistrationService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BrandsController],
      providers: [
        { provide: BrandsQueryService, useValue: mockBrandsQueryService },
        {
          provide: BrandsRegistrationService,
          useValue: mockBrandsRegistrationService,
        },
      ],
    })
      .overrideGuard(jest.fn())
      .useValue({ canActivate: () => true })
      .compile();

    brandsController = module.get<BrandsController>(BrandsController);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── createBrand ───────────────────────────────────────────────────────────

  describe('createBrand', () => {
    it('should delegate to BrandsRegistrationService.createBrand with userId from token', async () => {
      const dto: CreateBrandDto = { name: 'Toyota' };
      const brand = buildBrandStub({ createdBy: 'user-uuid-actor' });
      const mockReq = { user: { sub: 'user-uuid-actor' } } as AuthenticatedRequest;
      mockBrandsRegistrationService.createBrand.mockResolvedValue(brand);

      const result = await brandsController.createBrand(dto, mockReq);

      expect(mockBrandsRegistrationService.createBrand).toHaveBeenCalledWith(
        dto,
        'user-uuid-actor',
      );
      expect(result).toEqual(brand);
    });
  });

  // ─── findAllBrands ─────────────────────────────────────────────────────────

  describe('findAllBrands', () => {
    it('should delegate to BrandsQueryService.findAllBrands', async () => {
      const brands = [buildBrandStub()];
      mockBrandsQueryService.findAllBrands.mockResolvedValue(brands);

      const result = await brandsController.findAllBrands();

      expect(mockBrandsQueryService.findAllBrands).toHaveBeenCalledTimes(1);
      expect(result).toEqual(brands);
    });
  });

  // ─── findOneBrand ──────────────────────────────────────────────────────────

  describe('findOneBrand', () => {
    it('should delegate to BrandsQueryService.findOneBrand with the route id', async () => {
      const brand = buildBrandStub();
      mockBrandsQueryService.findOneBrand.mockResolvedValue(brand);

      const result = await brandsController.findOneBrand('brand-uuid-001');

      expect(mockBrandsQueryService.findOneBrand).toHaveBeenCalledWith(
        'brand-uuid-001',
      );
      expect(result).toEqual(brand);
    });
  });

  // ─── updateBrand ───────────────────────────────────────────────────────────

  describe('updateBrand', () => {
    it('should delegate to BrandsRegistrationService.updateBrand with id, dto, and userId from token', async () => {
      const dto: UpdateBrandDto = { name: 'Honda' };
      const updatedBrand = buildBrandStub({ name: 'Honda' });
      const mockReq = { user: { sub: 'user-uuid-actor' } } as AuthenticatedRequest;
      mockBrandsRegistrationService.updateBrand.mockResolvedValue(updatedBrand);

      const result = await brandsController.updateBrand('brand-uuid-001', dto, mockReq);

      expect(mockBrandsRegistrationService.updateBrand).toHaveBeenCalledWith(
        'brand-uuid-001',
        dto,
        'user-uuid-actor',
      );
      expect(result).toEqual(updatedBrand);
    });
  });

  // ─── removeBrand ───────────────────────────────────────────────────────────

  describe('removeBrand', () => {
    it('should delegate to BrandsRegistrationService.removeBrand with id and userId from token', async () => {
      const mockReq = { user: { sub: 'user-uuid-actor' } } as AuthenticatedRequest;
      mockBrandsRegistrationService.removeBrand.mockResolvedValue(undefined);

      await brandsController.removeBrand('brand-uuid-001', mockReq);

      expect(mockBrandsRegistrationService.removeBrand).toHaveBeenCalledWith(
        'brand-uuid-001',
        'user-uuid-actor',
      );
    });
  });
});
