import { CacheModule } from '@nestjs/cache-manager';
import { Global, INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { AuditLog } from '../../src/audit-consumer/schemas/audit-log.schema';
import { AppModule } from '../../src/app.module';
import { CacheInfraModule } from '../../src/cache/cache-infra.module';
import { MongoInfraModule } from '../../src/database/mongo-infra.module';
import { AuditMessagePublisherService } from '../../src/messaging/audit-message-publisher.service';
import { MessagingInfraModule } from '../../src/messaging/messaging-infra.module';
import { AUDIT_RABBITMQ_CLIENT } from '../../src/messaging/messaging.constants';
import {
  buildMockAuditLogModel,
  buildTypeOrmProviderOverrides,
  InfrastructureOverride,
  ProviderToken,
} from './test-infrastructure.mock';

/**
 * Replaces CacheInfraModule's Redis-backed store with the default in-memory
 * store so no TCP connection to Redis is attempted during E2E tests.
 */
@Module({ imports: [CacheModule.register({ isGlobal: true })] })
class MockCacheInfraModule {}

/**
 * Replaces MessagingInfraModule's RabbitMQ ClientProxy with a no-op mock
 * so no AMQP connection is opened. AuditMessagePublisherService is provided
 * as a no-op because VehiclesRegistrationService depends on it directly.
 */
@Global()
@Module({
  providers: [
    { provide: AUDIT_RABBITMQ_CLIENT, useValue: { emit: jest.fn() } },
    { provide: AuditMessagePublisherService, useValue: { publishAuditEvent: jest.fn() } },
  ],
  exports: [AuditMessagePublisherService],
})
class MockMessagingInfraModule {}

/**
 * Replaces MongoInfraModule's Mongoose connection with a mock so no MongoDB
 * TCP connection is attempted. Both the connection token and the AuditLog
 * model token are provided so AuditConsumerModule's forFeature() resolves.
 */
@Global()
@Module({
  providers: [
    { provide: getConnectionToken(), useValue: { model: jest.fn().mockReturnValue({}), models: {} } },
    { provide: getModelToken(AuditLog.name), useValue: buildMockAuditLogModel() },
  ],
  exports: [getConnectionToken(), getModelToken(AuditLog.name)],
})
class MockMongoInfraModule {}

function applyProviderOverrides(
  builder: TestingModuleBuilder,
  overrides: InfrastructureOverride[],
): TestingModuleBuilder {
  return overrides.reduce(
    (b, { provide, useValue }) =>
      b.overrideProvider(provide as ProviderToken).useValue(useValue),
    builder,
  );
}

/**
 * Bootstraps a fully initialised INestApplication for E2E tests.
 *
 * Uses overrideModule() for the three infrastructure modules that open TCP
 * connections inside async useFactory chains (Redis, RabbitMQ, MongoDB).
 * TypeORM repositories are overridden at the provider level because the
 * DataSource token IS the factory output and can be safely replaced there.
 */
export async function createTestApp(): Promise<INestApplication> {
  const baseBuilder = Test.createTestingModule({ imports: [AppModule] })
    .overrideModule(CacheInfraModule).useModule(MockCacheInfraModule)
    .overrideModule(MessagingInfraModule).useModule(MockMessagingInfraModule)
    .overrideModule(MongoInfraModule).useModule(MockMongoInfraModule);

  const moduleRef = await applyProviderOverrides(
    baseBuilder,
    buildTypeOrmProviderOverrides(),
  ).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.init();
  return app;
}
