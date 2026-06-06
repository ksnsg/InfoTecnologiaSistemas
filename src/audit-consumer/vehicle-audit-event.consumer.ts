import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AuditEvent } from '../messaging/interfaces/audit-event.interface';
import { RESOURCE_AUDIT_ROUTING_KEY } from '../messaging/messaging.constants';
import { AuditLogPersistenceService } from './audit-log-persistence.service';

/**
 * Microservice controller — receives resource audit events from RabbitMQ and
 * delegates persistence to AuditLogPersistenceService.
 * A single handler covers all resource types (VEHICLE, BRAND, MODEL) because
 * the routing key is generic and the resourceType discriminator is in the payload.
 */
@Controller()
export class ResourceAuditEventConsumer {
  constructor(
    private readonly auditLogPersistenceService: AuditLogPersistenceService,
  ) {}

  @EventPattern(RESOURCE_AUDIT_ROUTING_KEY)
  async handleAuditEvent(
    @Payload() event: AuditEvent,
  ): Promise<void> {
    await this.auditLogPersistenceService.persistAuditLog(event);
  }
}
