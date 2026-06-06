import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditEvent } from '../messaging/interfaces/audit-event.interface';
import { AuditLogPersistenceService } from './audit-log-persistence.service';
import { AuditLog } from './schemas/audit-log.schema';

/** Minimal mock: only the `create` method is invoked by the persistence service. */
type MockAuditLogModel = { create: jest.Mock };

function buildMockAuditLogModel(): MockAuditLogModel {
  return { create: jest.fn().mockResolvedValue(undefined) };
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

describe('AuditLogPersistenceService', () => {
  let auditLogPersistenceService: AuditLogPersistenceService;
  let mockAuditLogModel: MockAuditLogModel;

  beforeEach(async () => {
    mockAuditLogModel = buildMockAuditLogModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogPersistenceService,
        { provide: getModelToken(AuditLog.name), useValue: mockAuditLogModel },
      ],
    }).compile();

    auditLogPersistenceService = module.get<AuditLogPersistenceService>(
      AuditLogPersistenceService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  // ─── persistAuditLog ───────────────────────────────────────────────────────

  describe('persistAuditLog', () => {
    it('should map resourceId→resource_id, resourceType→resource_type, userId→user_id, occurredAt→timestamp', async () => {
      const event = buildAuditEventStub({ action: 'CREATE', resourceType: 'VEHICLE' });

      await auditLogPersistenceService.persistAuditLog(event);

      expect(mockAuditLogModel.create).toHaveBeenCalledTimes(1);
      expect(mockAuditLogModel.create).toHaveBeenCalledWith({
        action: 'CREATE',
        resource_type: 'VEHICLE',
        resource_id: 'vehicle-uuid-001',
        user_id: 'user-uuid-actor',
        timestamp: '2026-06-04T00:00:00.000Z',
      });
    });

    it('should persist BRAND UPDATE audit events with the correct resource_type', async () => {
      const event = buildAuditEventStub({
        action: 'UPDATE',
        resourceType: 'BRAND',
        resourceId: 'brand-uuid-001',
      });

      await auditLogPersistenceService.persistAuditLog(event);

      expect(mockAuditLogModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE', resource_type: 'BRAND', resource_id: 'brand-uuid-001' }),
      );
    });

    it('should persist MODEL DELETE audit events with the correct resource_type', async () => {
      const event = buildAuditEventStub({
        action: 'DELETE',
        resourceType: 'MODEL',
        resourceId: 'model-uuid-001',
      });

      await auditLogPersistenceService.persistAuditLog(event);

      expect(mockAuditLogModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE', resource_type: 'MODEL', resource_id: 'model-uuid-001' }),
      );
    });

    it('should propagate errors thrown by the Mongoose model', async () => {
      mockAuditLogModel.create.mockRejectedValue(
        new Error('MongoDB write failed'),
      );
      const event = buildAuditEventStub();

      await expect(
        auditLogPersistenceService.persistAuditLog(event),
      ).rejects.toThrow('MongoDB write failed');
    });
  });
});
