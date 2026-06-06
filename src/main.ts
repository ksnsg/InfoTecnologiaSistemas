import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AUDIT_LOGS_QUEUE } from './messaging/messaging.constants';

function buildRmqConsumerOptions(): MicroserviceOptions {
  const user = process.env.RABBITMQ_USER ?? 'admin';
  const pass = process.env.RABBITMQ_PASSWORD ?? 'admin';
  const host = process.env.RABBITMQ_HOST ?? 'localhost';
  const port = process.env.RABBITMQ_AMQP_PORT ?? '5672';
  const vhost = process.env.RABBITMQ_VHOST ?? 'aivacol_vhost';
  return {
    transport: Transport.RMQ,
    options: {
      urls: [`amqp://${user}:${pass}@${host}:${port}/${vhost}`],
      queue: AUDIT_LOGS_QUEUE,
      queueOptions: { durable: true },
      /**
       * noAck: false — the framework acknowledges the message only after the
       * handler resolves, guaranteeing at-least-once audit delivery to MongoDB.
       */
      noAck: false,
    },
  };
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  /**
   * Hybrid application: the same process serves both the HTTP REST API and
   * the RabbitMQ microservice consumer. connectMicroservice() must be called
   * before startAllMicroservices() and listen().
   */
  app.connectMicroservice<MicroserviceOptions>(buildRmqConsumerOptions());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Aivacol — Fleet Management API')
    .setDescription(
      'REST API for the Aivacol Fleet Management Platform.\n\n' +
      'Authenticate via **POST /auth/login** to obtain a Bearer token, ' +
      'then click **Authorize** and paste the token to access protected endpoints.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.startAllMicroservices();

  const port = process.env.APP_PORT ?? '3000';
  await app.listen(port, '0.0.0.0');
}

bootstrap().catch((err: unknown) => {
  console.error('[FATAL] bootstrap() rejected:', err);
  process.exit(1);
});
