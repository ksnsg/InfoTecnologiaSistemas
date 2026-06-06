import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AuditAction, AuditResourceType } from '../../messaging/interfaces/audit-event.interface';

export type AuditLogDocument = HydratedDocument<AuditLog>;

/**
 * MongoDB document that records every resource write operation.
 * Stored in the `audit_logs` collection of the audit database.
 * Intentionally schema-first so Mongoose enforces the contract at the
 * persistence layer rather than relying solely on TypeScript types.
 */
@Schema({ collection: 'audit_logs' })
export class AuditLog {
  @Prop({ required: true, enum: ['CREATE', 'UPDATE', 'DELETE'] })
  action!: AuditAction;

  /**
   * Domain entity type — allows a single collection to store audit entries
   * for all resources without requiring separate per-entity collections.
   */
  @Prop({ required: true, enum: ['VEHICLE', 'BRAND', 'MODEL'] })
  resource_type!: AuditResourceType;

  @Prop({ required: true })
  resource_id!: string;

  @Prop({ required: true })
  user_id!: string;

  /** ISO-8601 UTC timestamp copied verbatim from the published event payload. */
  @Prop({ required: true })
  timestamp!: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
