import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuditMessagePublisherService } from './audit-message-publisher.service';
import { AUDIT_LOGS_QUEUE, AUDIT_RABBITMQ_CLIENT } from './messaging.constants';

function buildRabbitMqUrl(config: ConfigService): string {
  const user = config.get<string>('RABBITMQ_USER') ?? 'admin';
  const pass = config.get<string>('RABBITMQ_PASSWORD') ?? 'admin';
  const host = config.get<string>('RABBITMQ_HOST') ?? 'localhost';
  const port = config.get<string>('RABBITMQ_AMQP_PORT') ?? '5672';
  const vhost = config.get<string>('RABBITMQ_VHOST') ?? 'aivacol_vhost';
  return `amqp://${user}:${pass}@${host}:${port}/${vhost}`;
}

/**
 * Global infrastructure module for RabbitMQ.
 * Mirrors CacheInfraModule: imported once in AppModule, credentials from env,
 * and exports AuditMessagePublisherService so feature modules never need to
 * import MessagingInfraModule explicitly.
 */
@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: AUDIT_RABBITMQ_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [buildRabbitMqUrl(config)],
            queue: AUDIT_LOGS_QUEUE,
            queueOptions: { durable: true },
            /**
             * noAck: true — audit events are fire-and-forget; we do not need
             * manual acknowledgement from the broker on the publisher side.
             */
            noAck: true,
          },
        }),
      },
    ]),
  ],
  providers: [AuditMessagePublisherService],
  exports: [AuditMessagePublisherService],
})
export class MessagingInfraModule {}
