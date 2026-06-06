import { Test, TestingModule } from '@nestjs/testing';
import { AuditEvent } from '../messaging/interfaces/audit-event.interface';
import { AuditLogPersistenceService } from './audit-log-persistence.service';
import { ResourceAuditEventConsumer } from './vehicle-audit-event.consumer';

type MockAuditLogPersistenceService = jest.Mocked<
  Pick<AuditLogPersistenceService, 'persistAuditLog'>
>;

function buildMockAuditLogPersistenceService(): MockAuditLogPersistenceService {
  return { persistAuditLog: jest.fn().mockResolvedValue(undefined) };
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

describe('ResourceAuditEventConsumer', () => {
  let resourceAuditEventConsumer: ResourceAuditEventConsumer;
  let mockAuditLogPersistenceService: MockAuditLogPersistenceService;

  beforeEach(async () => {
    mockAuditLogPersistenceService = buildMockAuditLogPersistenceService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResourceAuditEventConsumer],
      providers: [
        {
          provide: AuditLogPersistenceService,
          useValue: mockAuditLogPersistenceService,
        },
      ],
    }).compile();

    resourceAuditEventConsumer = module.get<ResourceAuditEventConsumer>(
      ResourceAuditEventConsumer,
    );
  });

  afterEach(() => jest.clearAllMocks());

  // ─── handleAuditEvent ──────────────────────────────────────────────────────

  describe('handleAuditEvent', () => {
    it('should delegate a VEHICLE CREATE event to AuditLogPersistenceService', async () => {
      const event = buildAuditEventStub({ action: 'CREATE', resourceType: 'VEHICLE' });

      await resourceAuditEventConsumer.handleAuditEvent(event);

      expect(mockAuditLogPersistenceService.persistAuditLog).toHaveBeenCalledTimes(1);
      expect(mockAuditLogPersistenceService.persistAuditLog).toHaveBeenCalledWith(event);
    });

    it('should delegate a BRAND UPDATE event to AuditLogPersistenceService', async () => {
      const event = buildAuditEventStub({ action: 'UPDATE', resourceType: 'BRAND' });

      await resourceAuditEventConsumer.handleAuditEvent(event);

      expect(mockAuditLogPersistenceService.persistAuditLog).toHaveBeenCalledWith(event);
    });

    it('should delegate a MODEL DELETE event to AuditLogPersistenceService', async () => {
      const event = buildAuditEventStub({ action: 'DELETE', resourceType: 'MODEL' });

      await resourceAuditEventConsumer.handleAuditEvent(event);

      expect(mockAuditLogPersistenceService.persistAuditLog).toHaveBeenCalledWith(event);
    });

    it('should propagate errors from AuditLogPersistenceService so the message is not acknowledged', async () => {
      mockAuditLogPersistenceService.persistAuditLog.mockRejectedValue(
        new Error('MongoDB write failed'),
      );
      const event = buildAuditEventStub();

      await expect(
        resourceAuditEventConsumer.handleAuditEvent(event),
      ).rejects.toThrow('MongoDB write failed');
    });
  });
});
