import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditConsumerModule } from './audit-consumer/audit-consumer.module';
import { AuthModule } from './auth/auth.module';
import { BrandsModule } from './brands/brands.module';
import { CacheInfraModule } from './cache/cache-infra.module';
import { DatabaseModule } from './database/database.module';
import { MongoInfraModule } from './database/mongo-infra.module';
import { SeedModule } from './database/seed/seed.module';
import { MessagingInfraModule } from './messaging/messaging-infra.module';
import { ModelsModule } from './models/models.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    /**
     * ConfigModule must come first so process.env is populated before any
     * useFactory (CacheInfraModule, MessagingInfraModule, MongoInfraModule).
     */
    ConfigModule.forRoot({ isGlobal: true }),
    CacheInfraModule,
    MessagingInfraModule,
    MongoInfraModule,
    DatabaseModule,
    UsersModule,
    AuthModule,
    BrandsModule,
    ModelsModule,
    VehiclesModule,
    AuditConsumerModule,
    SeedModule,
  ],
})
export class AppModule {}
