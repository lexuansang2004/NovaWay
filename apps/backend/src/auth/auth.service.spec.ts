import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';

// `bcrypt` is a CJS native binding whose exports are non-configurable, so
// jest.spyOn cannot wrap them — mock the module but delegate to the real
// implementation so every other test keeps exercising real hashing.
jest.mock('bcrypt', () => {
  const actual = jest.requireActual('bcrypt');
  return { ...actual, compare: jest.fn(actual.compare) };
});

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const buildUser = (overrides: Partial<User> = {}): User => ({
    id: 'user-id',
    email: 'driver@example.com',
    passwordHash: '',
    createdAt: new Date('2026-07-18T13:00:00.000Z'),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: { findByEmail: jest.fn(), findById: jest.fn(), create: jest.fn() },
        },
        { provide: JwtService, useValue: { sign: jest.fn() } },
      ],
    }).compile();

    authService = module.get(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  describe('register', () => {
    it('creates a user with a hashed password when the email is new', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(buildUser({ passwordHash: 'hashed' }));

      const result = await authService.register('driver@example.com', 'password123');

      expect(usersService.create).toHaveBeenCalledWith(
        'driver@example.com',
        expect.any(String),
      );
      const [, passwordHashArg] = usersService.create.mock.calls[0];
      expect(passwordHashArg).not.toBe('password123');
      expect(await bcrypt.compare('password123', passwordHashArg)).toBe(true);
      expect(result).toEqual({
        id: 'user-id',
        email: 'driver@example.com',
        created_at: '2026-07-18T13:00:00.000Z',
      });
    });

    it('rejects registration when the email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(buildUser());

      await expect(authService.register('driver@example.com', 'password123')).rejects.toThrow(
        ConflictException,
      );
      expect(usersService.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns an access token and user info for correct credentials', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      usersService.findByEmail.mockResolvedValue(buildUser({ passwordHash }));
      jwtService.sign.mockReturnValue('signed-jwt');

      const result = await authService.login('driver@example.com', 'password123');

      expect(jwtService.sign).toHaveBeenCalledWith({ sub: 'user-id', email: 'driver@example.com' });
      expect(result).toEqual({
        access_token: 'signed-jwt',
        user: { id: 'user-id', email: 'driver@example.com' },
      });
    });

    it('rejects login when the password is wrong', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      usersService.findByEmail.mockResolvedValue(buildUser({ passwordHash }));

      await expect(authService.login('driver@example.com', 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects login when the user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(authService.login('nobody@example.com', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('still runs a bcrypt comparison for an unknown email so response time does not leak it', async () => {
      const compareMock = bcrypt.compare as unknown as jest.Mock;
      compareMock.mockClear();
      usersService.findByEmail.mockResolvedValue(null);

      await expect(authService.login('nobody@example.com', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(compareMock).toHaveBeenCalledTimes(1);
      const [, hashArg] = compareMock.mock.calls[0];
      // A real cost-10 bcrypt hash, so the unknown-email path costs the same
      // work as comparing against a registered user's hash.
      expect(hashArg).toMatch(/^\$2[aby]\$10\$/);
    });
  });

  describe('me', () => {
    it('returns id and email for a known user', async () => {
      usersService.findById.mockResolvedValue(buildUser());

      const result = await authService.me('user-id');

      expect(result).toEqual({ id: 'user-id', email: 'driver@example.com' });
    });

    it('rejects when the user no longer exists', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(authService.me('missing-id')).rejects.toThrow(UnauthorizedException);
    });
  });
});
