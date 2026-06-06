/** Discriminated union of the three lifecycle write operations. */
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

/**
 * Resource types covered by the audit pipeline.
 * Adding a new domain entity here (e.g. 'DRIVER') is the only change
 * required in this file to extend audit coverage.
 */
export type AuditResourceType = 'VEHICLE' | 'BRAND' | 'MODEL';

/**
 * Generic audit event published to RabbitMQ after every write operation.
 * Replaces the vehicle-specific VehicleAuditEvent so a single routing key
 * and consumer covers all resource types.
 */
export interface AuditEvent {
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string;
  userId: string;
  /** ISO-8601 UTC timestamp set at the moment of publication. */
  occurredAt: string;
}
