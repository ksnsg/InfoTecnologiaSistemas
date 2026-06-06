import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import type { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

/**
 * We pick only the Repository methods actually used by UsersService.
 * jest.Mocked<Pick<...>> gives us full IntelliSense on mockResolvedValue, etc.,
 * without depending on any third-party mock library — satisfying the cursorrules
 * requirement of "native Jest mocks".
 */
type MockUserRepository = jest.Mocked<
  Pick<Repository<User>, 'findOne' | 'find' | 'create' | 'save'>
>;

function buildMockUserRepository(): MockUserRepository {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
}

function buildUserStub(overrides: Partial<User> = {}): User {
  const user = new User();
  user.id = 'uuid-001';
  user.name = 'Alice';
  user.nickname = 'alice99';
  user.email = 'alice@example.com';
  user.password = '$2b$10$hashedpassword';
  user.createdBy = null;
  return Object.assign(user, overrides);
}

describe('UsersService', () => {
  let usersService: UsersService;
  let mockUserRepository: MockUserRepository;

  beforeEach(async () => {
    mockUserRepository = buildMockUserRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // ─── createUser ────────────────────────────────────────────────────────────

  describe('createUser', () => {
    const dto: CreateUserDto = {
      name: 'Alice',
      nickname: 'alice99',
      email: 'alice@example.com',
      password: 'secret123',
    };
    const MOCK_HASH = '$2b$10$hashedpassword';

    it('should hash the password and persist the new user', async () => {
      const savedUser = buildUserStub();
      jest.spyOn(bcrypt, 'hash').mockResolvedValue(MOCK_HASH as never);
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(savedUser);
      mockUserRepository.save.mockResolvedValue(savedUser);

      const result = await usersService.createUser(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, expect.any(Number));
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        ...dto,
        password: MOCK_HASH,
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith(savedUser);
      expect(result).toEqual(savedUser);
    });

    it('should throw ConflictException when the email is already registered', async () => {
      mockUserRepository.findOne.mockResolvedValue(buildUserStub());

      await expect(usersService.createUser(dto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });

  // ─── findAllUsers ──────────────────────────────────────────────────────────

  describe('findAllUsers', () => {
    it('should return an array of all users', async () => {
      const users = [buildUserStub(), buildUserStub({ id: 'uuid-002' })];
      mockUserRepository.find.mockResolvedValue(users);

      const result = await usersService.findAllUsers();

      expect(mockUserRepository.find).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result).toEqual(users);
    });

    it('should return an empty array when no users exist', async () => {
      mockUserRepository.find.mockResolvedValue([]);

      const result = await usersService.findAllUsers();

      expect(result).toEqual([]);
    });
  });

  // ─── findUserById ──────────────────────────────────────────────────────────

  describe('findUserById', () => {
    it('should return the user when it exists', async () => {
      const user = buildUserStub();
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await usersService.findUserById('uuid-001');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-001' },
      });
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException when the user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        usersService.findUserById('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findUserByEmail ───────────────────────────────────────────────────────

  describe('findUserByEmail', () => {
    it('should return the user when the email exists', async () => {
      const user = buildUserStub();
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await usersService.findUserByEmail('alice@example.com');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'alice@example.com' },
      });
      expect(result).toEqual(user);
    });

    it('should return null when the email is not registered', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await usersService.findUserByEmail('ghost@example.com');

      expect(result).toBeNull();
    });
  });
});
