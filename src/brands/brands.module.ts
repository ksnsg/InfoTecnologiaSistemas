import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { BrandsController } from './brands.controller';
import { BrandsQueryService } from './brands-query.service';
import { BrandsRegistrationService } from './brands-registration.service';
import { Brand } from './entities/brand.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Brand]),
    /**
     * AuthModule is imported here (not globally) so that JwtAuthGuard and the
     * Passport JWT strategy are available to BrandsController without polluting
     * other modules that do not need authentication.
     */
    AuthModule,
  ],
  controllers: [BrandsController],
  providers: [BrandsQueryService, BrandsRegistrationService],
  exports: [BrandsQueryService],
})
export class BrandsModule {}
