import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLogPersistenceService } from './audit-log-persistence.service';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { ResourceAuditEventConsumer } from './vehicle-audit-event.consumer';

/**
 * Self-contained module that bridges RabbitMQ events to MongoDB audit records.
 * MongoInfraModule (global) owns the connection; this module only registers
 * the feature model so AuditLogPersistenceService can inject it via @InjectModel.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [ResourceAuditEventConsumer],
  providers: [AuditLogPersistenceService],
})
export class AuditConsumerModule {}
