import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';
import {
  CACHE_KEY_VEHICLES_ALL,
  CACHE_TTL_MS,
  vehicleCacheKey,
} from './vehicle-cache-keys.constants';

/**
 * Loading both 'vehicleModel' and 'vehicleModel.brand' in a single query
 * delivers the full ownership chain (Vehicle → Model → Brand) to the caller
 * without requiring a second round-trip.
 */
const VEHICLE_RELATIONS: string[] = ['vehicleModel', 'vehicleModel.brand'];

@Injectable()
export class VehiclesQueryService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async findAllVehicles(): Promise<Vehicle[]> {
    const cached = await this.cacheManager.get<Vehicle[]>(CACHE_KEY_VEHICLES_ALL);
    if (cached) return cached;

    const vehicles = await this.vehicleRepository.find({ relations: VEHICLE_RELATIONS });
    await this.cacheManager.set(CACHE_KEY_VEHICLES_ALL, vehicles, CACHE_TTL_MS);
    return vehicles;
  }

  async findOneVehicle(id: string): Promise<Vehicle> {
    const key = vehicleCacheKey(id);
    const cached = await this.cacheManager.get<Vehicle>(key);
    if (cached) return cached;

    const vehicle = await this.vehicleRepository.findOne({
      where: { id },
      relations: VEHICLE_RELATIONS,
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with id "${id}" was not found.`);
    }
    await this.cacheManager.set(key, vehicle, CACHE_TTL_MS);
    return vehicle;
  }
}
