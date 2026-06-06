import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { AuditMessagePublisherService } from '../messaging/audit-message-publisher.service';
import { BrandsRegistrationService } from './brands-registration.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { Brand } from './entities/brand.entity';

type MockBrandRepository = jest.Mocked<
  Pick<Repository<Brand>, 'findOne' | 'create' | 'save' | 'merge' | 'remove'>
>;

type MockAuditPublisher = jest.Mocked<
  Pick<AuditMessagePublisherService, 'publishAuditEvent'>
>;

function buildMockBrandRepository(): MockBrandRepository {
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    merge: jest.fn(),
    remove: jest.fn(),
  };
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

const ACTOR_USER_ID = 'user-uuid-actor';

describe('BrandsRegistrationService', () => {
  let brandsRegistrationService: BrandsRegistrationService;
  let mockBrandRepository: MockBrandRepository;
  let mockAuditPublisher: MockAuditPublisher;

  beforeEach(async () => {
    mockBrandRepository = buildMockBrandRepository();
    mockAuditPublisher = buildMockAuditPublisher();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandsRegistrationService,
        { provide: getRepositoryToken(Brand), useValue: mockBrandRepository },
        { provide: AuditMessagePublisherService, useValue: mockAuditPublisher },
      ],
    }).compile();

    brandsRegistrationService = module.get<BrandsRegistrationService>(
      BrandsRegistrationService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  // ─── createBrand ───────────────────────────────────────────────────────────

  describe('createBrand', () => {
    const dto: CreateBrandDto = { name: 'Toyota' };

    it('should persist the brand, set createdBy, and publish a CREATE audit event', async () => {
      const savedBrand = buildBrandStub({ createdBy: ACTOR_USER_ID });
      mockBrandRepository.findOne.mockResolvedValue(null);
      mockBrandRepository.create.mockReturnValue(savedBrand);
      mockBrandRepository.save.mockResolvedValue(savedBrand);

      const result = await brandsRegistrationService.createBrand(dto, ACTOR_USER_ID);

      expect(mockBrandRepository.create).toHaveBeenCalledWith({
        ...dto,
        createdBy: ACTOR_USER_ID,
      });
      expect(mockBrandRepository.save).toHaveBeenCalledWith(savedBrand);
      expect(result).toEqual(savedBrand);
      expect(mockAuditPublisher.publishAuditEvent).toHaveBeenCalledTimes(1);
      expect(mockAuditPublisher.publishAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          resourceType: 'BRAND',
          resourceId: savedBrand.id,
          userId: ACTOR_USER_ID,
        }),
      );
    });

    it('should throw ConflictException and NOT publish an audit event when brand name already exists', async () => {
      mockBrandRepository.findOne.mockResolvedValue(buildBrandStub());

      await expect(
        brandsRegistrationService.createBrand(dto, ACTOR_USER_ID),
      ).rejects.toThrow(ConflictException);
      expect(mockBrandRepository.save).not.toHaveBeenCalled();
      expect(mockAuditPublisher.publishAuditEvent).not.toHaveBeenCalled();
    });
  });

  // ─── updateBrand ───────────────────────────────────────────────────────────

  describe('updateBrand', () => {
    const dto: UpdateBrandDto = { name: 'Honda' };

    it('should merge the DTO, persist the update, and publish an UPDATE audit event', async () => {
      const existingBrand = buildBrandStub();
      const mergedBrand = buildBrandStub({ name: 'Honda' });
      mockBrandRepository.findOne.mockResolvedValue(existingBrand);
      mockBrandRepository.merge.mockReturnValue(mergedBrand);
      mockBrandRepository.save.mockResolvedValue(mergedBrand);

      const result = await brandsRegistrationService.updateBrand(
        'brand-uuid-001',
        dto,
        ACTOR_USER_ID,
      );

      expect(mockBrandRepository.merge).toHaveBeenCalledWith(existingBrand, dto);
      expect(mockBrandRepository.save).toHaveBeenCalledWith(mergedBrand);
      expect(result.name).toBe('Honda');
      expect(mockAuditPublisher.publishAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          resourceType: 'BRAND',
          resourceId: 'brand-uuid-001',
          userId: ACTOR_USER_ID,
        }),
      );
    });

    it('should throw NotFoundException and NOT publish an audit event when the brand does not exist', async () => {
      mockBrandRepository.findOne.mockResolvedValue(null);

      await expect(
        brandsRegistrationService.updateBrand('non-existent-id', dto, ACTOR_USER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(mockBrandRepository.save).not.toHaveBeenCalled();
      expect(mockAuditPublisher.publishAuditEvent).not.toHaveBeenCalled();
    });
  });

  // ─── removeBrand ───────────────────────────────────────────────────────────

  describe('removeBrand', () => {
    it('should remove the brand and publish a DELETE audit event', async () => {
      const brand = buildBrandStub();
      mockBrandRepository.findOne.mockResolvedValue(brand);
      mockBrandRepository.remove.mockResolvedValue(brand);

      await brandsRegistrationService.removeBrand('brand-uuid-001', ACTOR_USER_ID);

      expect(mockBrandRepository.remove).toHaveBeenCalledWith(brand);
      expect(mockAuditPublisher.publishAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE',
          resourceType: 'BRAND',
          resourceId: 'brand-uuid-001',
          userId: ACTOR_USER_ID,
        }),
      );
    });

    it('should throw NotFoundException and NOT publish an audit event when the brand does not exist', async () => {
      mockBrandRepository.findOne.mockResolvedValue(null);

      await expect(
        brandsRegistrationService.removeBrand('non-existent-id', ACTOR_USER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(mockBrandRepository.remove).not.toHaveBeenCalled();
      expect(mockAuditPublisher.publishAuditEvent).not.toHaveBeenCalled();
    });
  });
});
