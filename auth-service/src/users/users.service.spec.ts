import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser = {
    id: 'test-uuid-1234',
    email: 'test@example.com',
    passwordHash: 'hashed_password_123',
    name: 'Test User',
    role: 'USER',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    user: {
      create: vi.fn().mockResolvedValue(mockUser),
      findMany: vi.fn().mockResolvedValue([mockUser]),
      findUnique: vi.fn().mockResolvedValue(mockUser),
      update: vi.fn().mockResolvedValue({ ...mockUser, name: 'Updated Name' }),
      delete: vi.fn().mockResolvedValue(mockUser),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const result = await service.create({
        email: 'test@example.com',
        passwordHash: 'hashed_password_123',
        name: 'Test User',
      });
      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const result = await service.findAll();
      expect(result).toEqual([mockUser]);
      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      const result = await service.findByEmail('test@example.com');
      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      const result = await service.findById('test-uuid-1234');
      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-uuid-1234' },
      });
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      const result = await service.update('test-uuid-1234', { name: 'Updated Name' });
      expect(result.name).toBe('Updated Name');
      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a user', async () => {
      const result = await service.delete('test-uuid-1234');
      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 'test-uuid-1234' },
      });
    });
  });
});
