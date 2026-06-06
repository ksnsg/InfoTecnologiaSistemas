import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleModel } from './entities/vehicle-model.entity';

/**
 * The brand relation is always loaded ('brand' in relations array) so callers
 * receive a fully hydrated object without needing a second query.
 */
const VEHICLE_MODEL_RELATIONS: string[] = ['brand'];

@Injectable()
export class ModelsQueryService {
  constructor(
    @InjectRepository(VehicleModel)
    private readonly vehicleModelRepository: Repository<VehicleModel>,
  ) {}

  async findAllVehicleModels(): Promise<VehicleModel[]> {
    return this.vehicleModelRepository.find({
      relations: VEHICLE_MODEL_RELATIONS,
    });
  }

  async findOneVehicleModel(id: string): Promise<VehicleModel> {
    const model = await this.vehicleModelRepository.findOne({
      where: { id },
      relations: VEHICLE_MODEL_RELATIONS,
    });
    if (!model) {
      throw new NotFoundException(`VehicleModel with id "${id}" was not found.`);
    }
    return model;
  }
}
