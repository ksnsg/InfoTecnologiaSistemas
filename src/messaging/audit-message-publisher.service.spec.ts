import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { AuditMessagePublisherService } from './audit-message-publisher.service';
import { AuditEvent } from './interfaces/audit-event.interface';
import { AUDIT_RABBITMQ_CLIENT, RESOURCE_AUDIT_ROUTING_KEY } from './messaging.constants';

type MockClientProxy = jest.Mocked<{ emit: jest.Mock }>;

function buildMockClientProxy(): MockClientProxy {
  return { emit: jest.fn() };
}

function buildAuditEventStub(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    action: 'CREATE',
    resourceType: 'VEHICLE',
    resourceId: 'vehicle-uuid-001',
    userId: 'user-uuid-actor',
    occurredAt: '2026-06-04T00:00:00.000Z',
    ...overrides,
  };
}

describe('AuditMessagePublisherService', () => {
  let auditMessagePublisherService: AuditMessagePublisherService;
  let mockClientProxy: MockClientProxy;

  beforeEach(async () => {
    mockClientProxy = buildMockClientProxy();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditMessagePublisherService,
        { provide: AUDIT_RABBITMQ_CLIENT, useValue: mockClientProxy },
      ],
    }).compile();

    auditMessagePublisherService = module.get<AuditMessagePublisherService>(
      AuditMessagePublisherService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  // ─── publishAuditEvent ─────────────────────────────────────────────────────

  describe('publishAuditEvent', () => {
    it('should emit a VEHICLE CREATE event on the resource audit routing key', () => {
      mockClientProxy.emit.mockReturnValue(of(undefined));
      const event = buildAuditEventStub({ action: 'CREATE', resourceType: 'VEHICLE' });

      auditMessagePublisherService.publishAuditEvent(event);

      expect(mockClientProxy.emit).toHaveBeenCalledTimes(1);
      expect(mockClientProxy.emit).toHaveBeenCalledWith(
        RESOURCE_AUDIT_ROUTING_KEY,
        event,
      );
    });

    it('should emit a BRAND UPDATE event on the resource audit routing key', () => {
      mockClientProxy.emit.mockReturnValue(of(undefined));
      const event = buildAuditEventStub({ action: 'UPDATE', resourceType: 'BRAND' });

      auditMessagePublisherService.publishAuditEvent(event);

      expect(mockClientProxy.emit).toHaveBeenCalledWith(
        RESOURCE_AUDIT_ROUTING_KEY,
        event,
      );
    });

    it('should emit a MODEL DELETE event on the resource audit routing key', () => {
      mockClientProxy.emit.mockReturnValue(of(undefined));
      const event = buildAuditEventStub({ action: 'DELETE', resourceType: 'MODEL' });

      auditMessagePublisherService.publishAuditEvent(event);

      expect(mockClientProxy.emit).toHaveBeenCalledWith(
        RESOURCE_AUDIT_ROUTING_KEY,
        event,
      );
    });

    it('should NOT throw when the RMQ broker is unavailable', () => {
      mockClientProxy.emit.mockReturnValue(
        throwError(() => new Error('ECONNREFUSED: RabbitMQ unreachable')),
      );
      const event = buildAuditEventStub();

      expect(() =>
        auditMessagePublisherService.publishAuditEvent(event),
      ).not.toThrow();
    });
  });
});
