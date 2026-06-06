import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * Controller tests verify delegation: each route handler calls exactly the
 * correct service method with the correct arguments. Business-rule outcomes
 * belong in the service specs. Guard behaviour is validated by e2e tests.
 *
 * JwtAuthGuard is overridden here so tests are not coupled to Passport
 * internals — its runtime enforcement is validated by app.e2e-spec.ts.
 */

type MockUsersService = jest.Mocked<
  Pick<UsersService, 'createUser' | 'findAllUsers' | 'findUserById'>
>;

function buildMockUsersService(): MockUsersService {
  return {
    createUser: jest.fn(),
    findAllUsers: jest.fn(),
    findUserById: jest.fn(),
  };
}

function buildUserStub(overrides: Partial<User> = {}): User {
  const user = new User();
  user.id = 'user-uuid-001';
  user.name = 'Aivacol Admin';
  user.nickname = 'aivacol';
  user.email = 'admin@aivacol.com';
  user.password = '$2a$10$hashedpassword';
  user.createdBy = null;
  return Object.assign(user, overrides);
}

describe('UsersController', () => {
  let usersController: UsersController;
  let mockUsersService: MockUsersService;

  beforeEach(async () => {
    mockUsersService = buildMockUsersService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    usersController = module.get<UsersController>(UsersController);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── createUser ───────────────────────────────────────────────────────────

  describe('createUser', () => {
    it('should delegate to UsersService.createUser with the request body', async () => {
      const dto: CreateUserDto = {
        name: 'Aivacol Admin',
        nickname: 'aivacol',
        email: 'admin@aivacol.com',
        password: 'Admin@2026!',
      };
      const createdUser = buildUserStub();
      mockUsersService.createUser.mockResolvedValue(createdUser);

      const result = await usersController.createUser(dto);

      expect(mockUsersService.createUser).toHaveBeenCalledWith(dto);
      expect(result).toEqual(createdUser);
    });
  });

  // ─── findAllUsers ─────────────────────────────────────────────────────────

  describe('findAllUsers', () => {
    it('should delegate to UsersService.findAllUsers', async () => {
      const users = [buildUserStub()];
      mockUsersService.findAllUsers.mockResolvedValue(users);

      const result = await usersController.findAllUsers();

      expect(mockUsersService.findAllUsers).toHaveBeenCalledTimes(1);
      expect(result).toEqual(users);
    });
  });

  // ─── findUserById ─────────────────────────────────────────────────────────

  describe('findUserById', () => {
    it('should delegate to UsersService.findUserById with the route id', async () => {
      const user = buildUserStub();
      mockUsersService.findUserById.mockResolvedValue(user);

      const result = await usersController.findUserById('user-uuid-001');

      expect(mockUsersService.findUserById).toHaveBeenCalledWith('user-uuid-001');
      expect(result).toEqual(user);
    });
  });
});
