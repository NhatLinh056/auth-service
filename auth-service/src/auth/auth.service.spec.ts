import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OAuthProvidersService } from '../oauth-providers/oauth-providers.service.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: vi.fn(),
    create: vi.fn(),
  };

  const mockJwtService = {
    signAsync: vi.fn().mockResolvedValue('mocked_jwt_token_xyz'),
  };

  const mockOAuthProvidersService = {
    getPublicProviders: vi.fn().mockResolvedValue([
      { provider: 'google', name: 'Google', enabled: true },
      { provider: 'facebook', name: 'Facebook', enabled: false },
    ]),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: OAuthProvidersService,
          useValue: mockOAuthProvidersService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPublicProviders', () => {
    it('should delegate to oauthProvidersService.getPublicProviders', async () => {
      const res = await service.getPublicProviders();
      expect(res).toHaveLength(2);
      expect(mockOAuthProvidersService.getPublicProviders).toHaveBeenCalledOnce();
    });
  });

  describe('register', () => {
    it('should throw ConflictException if email already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: '123',
        email: 'exist@example.com',
      });

      await expect(
        service.register({
          email: 'exist@example.com',
          password: 'password123',
          name: 'Test',
        }),
      ).rejects.toThrow(ConflictException);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('exist@example.com');
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('should hash password and create user successfully', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({
        id: 'new-uuid-456',
        email: 'new@example.com',
        passwordHash: 'hashed_password_val',
        name: 'New User',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const spyBcrypt = vi.spyOn(bcrypt, 'hash');

      const result = await service.register({
        email: 'new@example.com',
        password: 'plainpassword',
        name: 'New User',
      });

      expect(spyBcrypt).toHaveBeenCalledWith('plainpassword', 10);
      expect(mockUsersService.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'new-uuid-456');
      expect(result).toHaveProperty('email', 'new@example.com');
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'notfound@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('notfound@example.com');
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: 'real_hash',
      });

      vi.spyOn(bcrypt, 'compare').mockImplementation(async () => false);

      await expect(
        service.login({
          email: 'user@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return accessToken and safe user when credentials are valid', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'John Doe',
        role: 'USER',
        passwordHash: 'real_hash',
      });

      vi.spyOn(bcrypt, 'compare').mockImplementation(async () => true);

      const result = await service.login({
        email: 'user@example.com',
        password: 'correctpassword',
      });

      expect(result).toHaveProperty('accessToken', 'mocked_jwt_token_xyz');
      expect(result.user).toHaveProperty('id', 'user-1');
      expect(result.user).toHaveProperty('email', 'user@example.com');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'user@example.com',
        role: 'USER',
      });
    });
  });

  describe('logout', () => {
    it('should return a success message', () => {
      const result = service.logout();

      expect(result).toHaveProperty('message');
      expect(typeof result.message).toBe('string');
      expect(result.message).toContain('Đăng xuất thành công');
    });
  });
});
