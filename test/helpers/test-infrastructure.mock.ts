import { Type } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager, DataSource } from 'typeorm';
import { Brand } from '../../src/brands/entities/brand.entity';
import { VehicleModel } from '../../src/models/entities/vehicle-model.entity';
import { User } from '../../src/users/entities/user.entity';
import { Vehicle } from '../../src/vehicles/entities/vehicle.entity';

/**
 * Mirror of the token union accepted by TestingModuleBuilder.overrideProvider().
 * Function is included because getRepositoryToken() returns string | Function
 * depending on how the entity was registered with TypeORM.
 */
export type ProviderToken = Type<unknown> | Function | string | symbol;

export type InfrastructureOverride = {
  provide: ProviderToken;
  useValue: unknown;
};

/** Generic repository mock covering every method used across all services. */
export type MockRepository = {
  find: jest.Mock;
  findOne: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
  remove: jest.Mock;
  delete: jest.Mock;
  count: jest.Mock;
};

export function buildMockRepository(): MockRepository {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockImplementation((e: unknown) => Promise.resolve(e)),
    create: jest.fn().mockImplementation((e: unknown) => e),
    remove: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    count: jest.fn().mockResolvedValue(0),
  };
}

export function buildMockDataSource(): Partial<DataSource> {
  return {
    isInitialized: true,
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    getRepository: jest.fn().mockReturnValue(buildMockRepository()),
    manager: {} as EntityManager,
  };
}

export function buildMockAuditLogModel(): object {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  };
}

/**
 * Provider-level overrides for TypeORM only.
 * Cache, Messaging, and MongoDB are handled at the module level via
 * overrideModule() in AppTestBootstrapper because their async useFactory
 * functions open TCP connections before provider-level overrides take effect.
 *
 * The User repository returns a non-empty array so SeedService skips the
 * admin-user creation step, avoiding a bcrypt computation on every run.
 */
export function buildTypeOrmProviderOverrides(): InfrastructureOverride[] {
  const seedSkipUserRepo = buildMockRepository();
  seedSkipUserRepo.find.mockResolvedValue([{ id: 'existing-admin-uuid' }]);

  return [
    { provide: DataSource, useValue: buildMockDataSource() },
    { provide: EntityManager, useValue: {} },
    { provide: getRepositoryToken(User), useValue: seedSkipUserRepo },
    { provide: getRepositoryToken(Brand), useValue: buildMockRepository() },
    { provide: getRepositoryToken(VehicleModel), useValue: buildMockRepository() },
    { provide: getRepositoryToken(Vehicle), useValue: buildMockRepository() },
  ];
}
