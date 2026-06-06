import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BrandsQueryService } from '../brands/brands-query.service';
import { AuditMessagePublisherService } from '../messaging/audit-message-publisher.service';
import { AuditAction } from '../messaging/interfaces/audit-event.interface';
import { CreateVehicleModelDto } from './dto/create-vehicle-model.dto';
import { UpdateVehicleModelDto } from './dto/update-vehicle-model.dto';
import { VehicleModel } from './entities/vehicle-model.entity';

@Injectable()
export class ModelsRegistrationService {
  constructor(
    @InjectRepository(VehicleModel)
    private readonly vehicleModelRepository: Repository<VehicleModel>,
    private readonly brandsQueryService: BrandsQueryService,
    private readonly auditMessagePublisherService: AuditMessagePublisherService,
  ) {}

  async createVehicleModel(
    dto: CreateVehicleModelDto,
    userId: string,
  ): Promise<VehicleModel> {
    const brand = await this.brandsQueryService.findOneBrand(dto.brandId);

    const duplicate = await this.vehicleModelRepository.findOne({
      where: { name: dto.name, brand: { id: dto.brandId } },
    });
    if (duplicate) {
      throw new ConflictException(
        `A model named "${dto.name}" already exists under this brand.`,
      );
    }

    const modelToSave = this.vehicleModelRepository.create({
      name: dto.name,
      brand,
      createdBy: userId,
    });
    const saved = await this.vehicleModelRepository.save(modelToSave);
    this.publishAuditEvent('CREATE', saved.id, userId);
    return saved;
  }

  async updateVehicleModel(
    id: string,
    dto: UpdateVehicleModelDto,
    userId: string,
  ): Promise<VehicleModel> {
    const model = await this.vehicleModelRepository.findOne({
      where: { id },
      relations: ['brand'],
    });
    if (!model) {
      throw new NotFoundException(`VehicleModel with id "${id}" was not found.`);
    }

    if (dto.brandId !== undefined) {
      model.brand = await this.brandsQueryService.findOneBrand(dto.brandId);
    }
    if (dto.name !== undefined) {
      model.name = dto.name;
    }

    const saved = await this.vehicleModelRepository.save(model);
    this.publishAuditEvent('UPDATE', id, userId);
    return saved;
  }

  async removeVehicleModel(id: string, userId: string): Promise<void> {
    const model = await this.vehicleModelRepository.findOne({ where: { id } });
    if (!model) {
      throw new NotFoundException(`VehicleModel with id "${id}" was not found.`);
    }
    await this.vehicleModelRepository.remove(model);
    this.publishAuditEvent('DELETE', id, userId);
  }

  private publishAuditEvent(
    action: AuditAction,
    resourceId: string,
    userId: string,
  ): void {
    this.auditMessagePublisherService.publishAuditEvent({
      action,
      resourceType: 'MODEL',
      resourceId,
      userId,
      occurredAt: new Date().toISOString(),
    });
  }
}
