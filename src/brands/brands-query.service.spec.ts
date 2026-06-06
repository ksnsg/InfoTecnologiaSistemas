import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { BrandsQueryService } from './brands-query.service';
import { Brand } from './entities/brand.entity';

type MockBrandRepository = jest.Mocked<
  Pick<Repository<Brand>, 'find' | 'findOne'>
>;

function buildMockBrandRepository(): MockBrandRepository {
  return { find: jest.fn(), findOne: jest.fn() };
}

function buildBrandStub(overrides: Partial<Brand> = {}): Brand {
  const brand = new Brand();
  brand.id = 'brand-uuid-001';
  brand.name = 'Toyota';
  brand.createdBy = null;
  return Object.assign(brand, overrides);
}

describe('BrandsQueryService', () => {
  let brandsQueryService: BrandsQueryService;
  let mockBrandRepository: MockBrandRepository;

  beforeEach(async () => {
    mockBrandRepository = buildMockBrandRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandsQueryService,
        { provide: getRepositoryToken(Brand), useValue: mockBrandRepository },
      ],
    }).compile();

    brandsQueryService = module.get<BrandsQueryService>(BrandsQueryService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── findAllBrands ─────────────────────────────────────────────────────────

  describe('findAllBrands', () => {
    it('should return an array of all brands', async () => {
      const brands = [buildBrandStub(), buildBrandStub({ id: 'brand-uuid-002', name: 'Honda' })];
      mockBrandRepository.find.mockResolvedValue(brands);

      const result = await brandsQueryService.findAllBrands();

      expect(mockBrandRepository.find).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result).toEqual(brands);
    });

    it('should return an empty array when no brands exist', async () => {
      mockBrandRepository.find.mockResolvedValue([]);

      const result = await brandsQueryService.findAllBrands();

      expect(result).toEqual([]);
    });
  });

  // ─── findOneBrand ──────────────────────────────────────────────────────────

  describe('findOneBrand', () => {
    it('should return the brand when it exists', async () => {
      const brand = buildBrandStub();
      mockBrandRepository.findOne.mockResolvedValue(brand);

      const result = await brandsQueryService.findOneBrand('brand-uuid-001');

      expect(mockBrandRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'brand-uuid-001' },
      });
      expect(result).toEqual(brand);
    });

    it('should throw NotFoundException when the brand does not exist', async () => {
      mockBrandRepository.findOne.mockResolvedValue(null);

      await expect(
        brandsQueryService.findOneBrand('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
