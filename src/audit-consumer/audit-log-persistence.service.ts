import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditEvent } from '../messaging/interfaces/audit-event.interface';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

@Injectable()
export class AuditLogPersistenceService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  /**
   * Maps an AuditEvent to the AuditLog schema and persists it.
   * camelCase → snake_case field mapping is deliberate: the schema follows
   * MongoDB/audit-log conventions while the event follows NestJS/TypeScript ones.
   */
  async persistAuditLog(event: AuditEvent): Promise<void> {
    await this.auditLogModel.create({
      action: event.action,
      resource_type: event.resourceType,
      resource_id: event.resourceId,
      user_id: event.userId,
      timestamp: event.occurredAt,
    });
  }
}
