/**
 * Injection token for the RabbitMQ ClientProxy used by the audit pipeline.
 * Named explicitly so it remains greppable across the entire codebase.
 */
export const AUDIT_RABBITMQ_CLIENT = 'AUDIT_RABBITMQ_CLIENT';

/** Durable queue where all resource lifecycle audit events are published. */
export const AUDIT_LOGS_QUEUE = 'audit_logs_queue';

/**
 * Generic routing key for all resource (vehicle, brand, model) lifecycle events.
 * A single key keeps the consumer simple; the resourceType field inside the
 * payload carries the domain-specific discriminator when needed.
 */
export const RESOURCE_AUDIT_ROUTING_KEY = 'resource.audit';
