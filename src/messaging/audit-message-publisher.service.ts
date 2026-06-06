import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AuditEvent } from './interfaces/audit-event.interface';
import { AUDIT_RABBITMQ_CLIENT, RESOURCE_AUDIT_ROUTING_KEY } from './messaging.constants';

@Injectable()
export class AuditMessagePublisherService {
  private readonly logger = new Logger(AuditMessagePublisherService.name);

  constructor(
    @Inject(AUDIT_RABBITMQ_CLIENT)
    private readonly auditRmqClient: ClientProxy,
  ) {}

  /**
   * Publishes a resource lifecycle event to RabbitMQ.
   *
   * Intentionally fire-and-forget: the Observable returned by ClientProxy.emit
   * is subscribed internally and errors are swallowed with structured logging.
   * Audit publication must NEVER block or roll back the primary operation.
   */
  publishAuditEvent(event: AuditEvent): void {
    this.auditRmqClient
      .emit<void, AuditEvent>(RESOURCE_AUDIT_ROUTING_KEY, event)
      .subscribe({
        error: (err: Error) => {
          this.logger.error(
            JSON.stringify({
              message: 'Failed to publish audit event to RabbitMQ',
              routing_key: RESOURCE_AUDIT_ROUTING_KEY,
              action: event.action,
              resourceType: event.resourceType,
              resourceId: event.resourceId,
              userId: event.userId,
              error: err.message,
            }),
          );
        },
      });
  }
}
