import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

function buildMongoUri(config: ConfigService): string {
  const user = config.get<string>('MONGO_USER') ?? 'admin';
  const pass = config.get<string>('MONGO_PASSWORD') ?? 'admin';
  const host = config.get<string>('MONGO_HOST') ?? 'localhost';
  const port = config.get<string>('MONGO_PORT') ?? '27017';
  const db = config.get<string>('MONGO_DB') ?? 'aivacol_audit';
  return `mongodb://${user}:${pass}@${host}:${port}/${db}?authSource=admin`;
}

/**
 * Global infrastructure module for MongoDB.
 * Registers the Mongoose connection once so any feature module may call
 * MongooseModule.forFeature([...]) without importing this module explicitly.
 */
@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: buildMongoUri(config),
      }),
    }),
  ],
})
export class MongoInfraModule {}
