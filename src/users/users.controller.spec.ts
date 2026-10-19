import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockUser = {
    id: 'user-uuid-1234',
    email: 'test@example.com',
    passwordHash: 'hashed_pw',
    name: 'Old Name',
    role: 'USER' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    findById: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMe', () => {
    it('should return current user profile without passwordHash', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      const req = {
        user: { sub: 'user-uuid-1234', email: 'test@example.com', role: 'USER' },
      } as any;

      const result = await controller.getMe(req);
      expect(result).toEqual({
        id: 'user-uuid-1234',
        email: 'test@example.com',
        name: 'Old Name',
        role: 'USER',
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);
      const req = {
        user: { sub: 'non-existent', email: 'none@example.com', role: 'USER' },
      } as any;

      await expect(controller.getMe(req)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAll', () => {
    it('should return all users without passwordHash', async () => {
      mockUsersService.findAll.mockResolvedValue([mockUser]);

      const result = await controller.getAll();
      expect(result).toEqual([
        {
          id: 'user-uuid-1234',
          email: 'test@example.com',
          name: 'Old Name',
          role: 'USER',
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
      ]);
      expect(result[0]).not.toHaveProperty('passwordHash');
    });
  });

  describe('getUserById', () => {
    it('should return user by id without passwordHash', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await controller.getUserById('user-uuid-1234');
      expect(result).toEqual({
        id: 'user-uuid-1234',
        email: 'test@example.com',
        name: 'Old Name',
        role: 'USER',
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw NotFoundException if id does not exist', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(controller.getUserById('not-found')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUser', () => {
    it('should update name and return updated user without passwordHash', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockUsersService.update.mockResolvedValue({
        ...mockUser,
        name: 'New Name',
      });

      const result = await controller.updateUser('user-uuid-1234', {
        name: 'New Name',
      });

      expect(mockUsersService.update).toHaveBeenCalledWith('user-uuid-1234', {
        name: 'New Name',
      });
      expect(result.name).toBe('New Name');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should hash new password if password is provided', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockUsersService.update.mockResolvedValue({
        ...mockUser,
        name: 'New Name',
        passwordHash: 'new_hashed_password',
      });

      const hashSpy = vi.spyOn(bcrypt, 'hash').mockResolvedValue('new_hashed_password' as never);

      const result = await controller.updateUser('user-uuid-1234', {
        name: 'New Name',
        password: 'newSecretPassword123',
      });

      expect(hashSpy).toHaveBeenCalledWith('newSecretPassword123', 10);
      expect(mockUsersService.update).toHaveBeenCalledWith('user-uuid-1234', {
        name: 'New Name',
        passwordHash: 'new_hashed_password',
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw NotFoundException if user to update does not exist', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(
        controller.updateUser('non-existent', { name: 'Something' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
