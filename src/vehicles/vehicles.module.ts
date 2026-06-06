import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ModelsModule } from '../models/models.module';
import { Vehicle } from './entities/vehicle.entity';
import { VehicleCacheInvalidationService } from './vehicle-cache-invalidation.service';
import { VehiclesController } from './vehicles.controller';
import { VehiclesQueryService } from './vehicles-query.service';
import { VehiclesRegistrationService } from './vehicles-registration.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle]),
    ModelsModule,
    AuthModule,
    /**
     * CacheInfraModule is registered as global in AppModule, so CACHE_MANAGER
     * is available here without an explicit import. No import needed.
     */
  ],
  controllers: [VehiclesController],
  providers: [
    VehiclesQueryService,
    VehiclesRegistrationService,
    VehicleCacheInvalidationService,
  ],
  exports: [VehiclesQueryService],
})
export class VehiclesModule {}
