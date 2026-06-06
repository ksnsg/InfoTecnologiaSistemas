import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

/**
 * Only the methods consumed by AuthService are included in each mock type.
 * This keeps the contract surface minimal and makes it obvious when AuthService
 * starts depending on a new method — it will break compilation here first.
 */
type MockUsersService = jest.Mocked<Pick<UsersService, 'findUserByNickname'>>;
type MockJwtService = jest.Mocked<Pick<JwtService, 'sign'>>;

function buildMockUsersService(): MockUsersService {
  return { findUserByNickname: jest.fn() };
}

function buildMockJwtService(): MockJwtService {
  return { sign: jest.fn() };
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

describe('AuthService', () => {
  let authService: AuthService;
  let mockUsersService: MockUsersService;
  let mockJwtService: MockJwtService;

  const loginDto: LoginDto = {
    nickname: 'alice99',
    password: 'secret123',
  };

  beforeEach(async () => {
    mockUsersService = buildMockUsersService();
    mockJwtService = buildMockJwtService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // ─── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('should return an access_token when credentials are valid', async () => {
      const user = buildUserStub();
      const expectedToken = 'signed.jwt.token';

      mockUsersService.findUserByNickname.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockJwtService.sign.mockReturnValue(expectedToken);

      const result = await authService.login(loginDto);

      expect(mockUsersService.findUserByNickname).toHaveBeenCalledWith(
        loginDto.nickname,
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        user.password,
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: user.id,
        nickname: user.nickname,
      });
      expect(result).toEqual({ access_token: expectedToken });
    });

    it('should throw UnauthorizedException when the nickname is not registered', async () => {
      mockUsersService.findUserByNickname.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when the password does not match', async () => {
      mockUsersService.findUserByNickname.mockResolvedValue(buildUserStub());
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should return the same error message for both missing user and wrong password', async () => {
      /**
       * Identical error messages prevent user enumeration:
       * an attacker cannot determine whether a nickname exists in the system
       * based on the error response.
       */
      mockUsersService.findUserByNickname.mockResolvedValue(null);
      const errorWhenNotFound = await authService
        .login(loginDto)
        .catch((e: UnauthorizedException) => e.message);

      mockUsersService.findUserByNickname.mockResolvedValue(buildUserStub());
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      const errorWhenWrongPassword = await authService
        .login(loginDto)
        .catch((e: UnauthorizedException) => e.message);

      expect(errorWhenNotFound).toBe(errorWhenWrongPassword);
    });
  });
});
