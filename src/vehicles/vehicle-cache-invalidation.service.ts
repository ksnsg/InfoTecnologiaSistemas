import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import {
  CACHE_KEY_VEHICLES_ALL,
  vehicleCacheKey,
} from './vehicle-cache-keys.constants';

/**
 * Centralises all Vehicle cache eviction logic in one place.
 * Write operations in VehiclesRegistrationService delegate here instead of
 * calling the cache manager directly, keeping mutation and cache concerns separate.
 */
@Injectable()
export class VehicleCacheInvalidationService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async invalidateVehiclesListCache(): Promise<void> {
    await this.cacheManager.del(CACHE_KEY_VEHICLES_ALL);
  }

  async invalidateVehicleByIdCache(id: string): Promise<void> {
    await this.cacheManager.del(vehicleCacheKey(id));
  }

  async invalidateAllVehicleCacheEntries(id: string): Promise<void> {
    await Promise.all([
      this.invalidateVehiclesListCache(),
      this.invalidateVehicleByIdCache(id),
    ]);
  }
}
