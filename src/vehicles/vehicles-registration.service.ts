import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditMessagePublisherService } from '../messaging/audit-message-publisher.service';
import { AuditAction } from '../messaging/interfaces/audit-event.interface';
import { ModelsQueryService } from '../models/models-query.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from './entities/vehicle.entity';
import { VehicleCacheInvalidationService } from './vehicle-cache-invalidation.service';

@Injectable()
export class VehiclesRegistrationService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    private readonly modelsQueryService: ModelsQueryService,
    private readonly vehicleCacheInvalidationService: VehicleCacheInvalidationService,
    private readonly auditMessagePublisherService: AuditMessagePublisherService,
  ) {}

  async createVehicle(dto: CreateVehicleDto, userId: string): Promise<Vehicle> {
    const vehicleModel = await this.modelsQueryService.findOneVehicleModel(
      dto.modelId,
    );
    const vehicleToSave = this.vehicleRepository.create({
      licensePlate: dto.licensePlate,
      chassis: dto.chassis,
      renavam: dto.renavam,
      year: dto.year,
      vehicleModel,
      createdBy: userId,
    });
    const saved = await this.vehicleRepository.save(vehicleToSave);
    await this.vehicleCacheInvalidationService.invalidateVehiclesListCache();
    this.publishAuditEvent('CREATE', saved.id, userId);
    return saved;
  }

  async updateVehicle(
    id: string,
    dto: UpdateVehicleDto,
    userId: string,
  ): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id },
      relations: ['vehicleModel'],
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with id "${id}" was not found.`);
    }

    if (dto.modelId !== undefined) {
      vehicle.vehicleModel = await this.modelsQueryService.findOneVehicleModel(
        dto.modelId,
      );
    }
    if (dto.licensePlate !== undefined) vehicle.licensePlate = dto.licensePlate;
    if (dto.chassis !== undefined) vehicle.chassis = dto.chassis;
    if (dto.renavam !== undefined) vehicle.renavam = dto.renavam;
    if (dto.year !== undefined) vehicle.year = dto.year;

    const saved = await this.vehicleRepository.save(vehicle);
    await this.vehicleCacheInvalidationService.invalidateAllVehicleCacheEntries(
      id,
    );
    this.publishAuditEvent('UPDATE', saved.id, userId);
    return saved;
  }

  async removeVehicle(id: string, userId: string): Promise<void> {
    const vehicle = await this.vehicleRepository.findOne({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with id "${id}" was not found.`);
    }
    await this.vehicleRepository.remove(vehicle);
    await this.vehicleCacheInvalidationService.invalidateAllVehicleCacheEntries(
      id,
    );
    /**
     * Use the `id` parameter (not vehicle.id) because TypeORM clears the
     * entity's primary key after remove().
     */
    this.publishAuditEvent('DELETE', id, userId);
  }

  private publishAuditEvent(
    action: AuditAction,
    resourceId: string,
    userId: string,
  ): void {
    this.auditMessagePublisherService.publishAuditEvent({
      action,
      resourceType: 'VEHICLE',
      resourceId,
      userId,
      occurredAt: new Date().toISOString(),
    });
  }
}
