import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditMessagePublisherService } from '../messaging/audit-message-publisher.service';
import { AuditAction } from '../messaging/interfaces/audit-event.interface';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { Brand } from './entities/brand.entity';

@Injectable()
export class BrandsRegistrationService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    private readonly auditMessagePublisherService: AuditMessagePublisherService,
  ) {}

  async createBrand(dto: CreateBrandDto, userId: string): Promise<Brand> {
    const existing = await this.brandRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `A brand named "${dto.name}" already exists.`,
      );
    }
    const brandToSave = this.brandRepository.create({ ...dto, createdBy: userId });
    const saved = await this.brandRepository.save(brandToSave);
    this.publishAuditEvent('CREATE', saved.id, userId);
    return saved;
  }

  async updateBrand(
    id: string,
    dto: UpdateBrandDto,
    userId: string,
  ): Promise<Brand> {
    const brand = await this.brandRepository.findOne({ where: { id } });
    if (!brand) {
      throw new NotFoundException(`Brand with id "${id}" was not found.`);
    }
    const updated = this.brandRepository.merge(brand, dto);
    const saved = await this.brandRepository.save(updated);
    this.publishAuditEvent('UPDATE', id, userId);
    return saved;
  }

  async removeBrand(id: string, userId: string): Promise<void> {
    const brand = await this.brandRepository.findOne({ where: { id } });
    if (!brand) {
      throw new NotFoundException(`Brand with id "${id}" was not found.`);
    }
    await this.brandRepository.remove(brand);
    this.publishAuditEvent('DELETE', id, userId);
  }

  private publishAuditEvent(
    action: AuditAction,
    resourceId: string,
    userId: string,
  ): void {
    this.auditMessagePublisherService.publishAuditEvent({
      action,
      resourceType: 'BRAND',
      resourceId,
      userId,
      occurredAt: new Date().toISOString(),
    });
  }
}
