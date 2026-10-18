import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;

  const mockUsersService = {
    findByEmail: vi.fn(),
    create: vi.fn(),
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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
});
