import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { BrandsModule } from '../brands/brands.module';
import { VehicleModel } from './entities/vehicle-model.entity';
import { ModelsController } from './models.controller';
import { ModelsQueryService } from './models-query.service';
import { ModelsRegistrationService } from './models-registration.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([VehicleModel]),
    /**
     * BrandsModule is imported to access the exported BrandsQueryService,
     * which is used by ModelsRegistrationService to validate brand existence
     * before creating or updating a model.
     */
    BrandsModule,
    AuthModule,
  ],
  controllers: [ModelsController],
  providers: [ModelsQueryService, ModelsRegistrationService],
  exports: [ModelsQueryService],
})
export class ModelsModule {}
