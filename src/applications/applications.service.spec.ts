import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppStatus, Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtPayload } from '../common/strategies/jwt.strategy.js';
import { ApplicationsService } from './applications.service.js';

describe('ApplicationsService', () => {
  let service: ApplicationsService;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'user@example.com',
    role: Role.USER,
  };

  const mockAdmin = {
    id: 'admin-uuid-1',
    email: 'admin@example.com',
    role: Role.ADMIN,
  };

  const mockApplication = {
    id: 'app-uuid-1',
    name: 'Order Service',
    appId: 'app_1234567890abcdef12345678',
    appToken: 'apt_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    status: AppStatus.ACTIVE,
    userId: 'user-uuid-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    user: {
      findUnique: vi.fn(),
    },
    application: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrismaService.application.findUnique.mockResolvedValue(null);
    mockPrismaService.user.findUnique.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ApplicationsService>(ApplicationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAppId', () => {
    it('should generate an appId starting with app_ and 24 hex characters (28 chars total)', () => {
      const appId = service.generateAppId();
      expect(appId).toMatch(/^app_[0-9a-f]{24}$/);
      expect(appId.length).toBe(28);
    });

    it('should generate distinct appIds on successive calls', () => {
      const id1 = service.generateAppId();
      const id2 = service.generateAppId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateUniqueAppId', () => {
    it('should return appId immediately if no collision exists in database', async () => {
      mockPrismaService.application.findUnique.mockResolvedValue(null);

      const appId = await service.generateUniqueAppId();

      expect(appId).toMatch(/^app_[0-9a-f]{24}$/);
      expect(mockPrismaService.application.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should retry when collision occurs and return unique appId on next attempt', async () => {
      // Lần 1: va chạm (trả về mockApplication), Lần 2: không va chạm (trả về null)
      mockPrismaService.application.findUnique
        .mockResolvedValueOnce(mockApplication)
        .mockResolvedValueOnce(null);

      const appId = await service.generateUniqueAppId();

      expect(appId).toMatch(/^app_[0-9a-f]{24}$/);
      expect(mockPrismaService.application.findUnique).toHaveBeenCalledTimes(2);
    });

    it('should throw InternalServerErrorException if all retry attempts collide', async () => {
      mockPrismaService.application.findUnique.mockResolvedValue(mockApplication);

      await expect(service.generateUniqueAppId(3)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mockPrismaService.application.findUnique).toHaveBeenCalledTimes(3);
    });
  });

  describe('generateAppToken', () => {
    it('should generate an appToken starting with apt_ and 64 hex characters', () => {
      const appToken = service.generateAppToken();
      expect(appToken).toMatch(/^apt_[0-9a-f]{64}$/);
    });

    it('should generate distinct appTokens on successive calls', () => {
      const token1 = service.generateAppToken();
      const token2 = service.generateAppToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('create', () => {
    it('should create an application for the current user', async () => {
      const currentUser: JwtPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: Role.USER,
      };

      mockPrismaService.application.create.mockResolvedValue(mockApplication);

      const result = await service.create(
        { name: 'Order Service' },
        currentUser,
      );

      expect(result).toEqual(mockApplication);
      expect(mockPrismaService.application.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Order Service',
            userId: mockUser.id,
            status: AppStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should allow ADMIN to specify target userId for the application', async () => {
      const currentAdmin: JwtPayload = {
        sub: mockAdmin.id,
        email: mockAdmin.email,
        role: Role.ADMIN,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.application.create.mockResolvedValue({
        ...mockApplication,
        userId: mockUser.id,
      });

      const result = await service.create(
        { name: 'Order Service', userId: mockUser.id },
        currentAdmin,
      );

      expect(result.userId).toBe(mockUser.id);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(mockPrismaService.application.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Order Service',
            userId: mockUser.id,
          }),
        }),
      );
    });

    it('should throw NotFoundException if ADMIN specifies non-existent user', async () => {
      const currentAdmin: JwtPayload = {
        sub: mockAdmin.id,
        email: mockAdmin.email,
        role: Role.ADMIN,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          { name: 'Order Service', userId: 'non-existent-user' },
          currentAdmin,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.application.create).not.toHaveBeenCalled();
    });

    it('should ignore userId in body if caller is not ADMIN and use caller sub', async () => {
      const currentUser: JwtPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: Role.USER,
      };

      mockPrismaService.application.create.mockResolvedValue(mockApplication);

      const result = await service.create(
        { name: 'Order Service', userId: 'some-other-uuid' },
        currentUser,
      );

      expect(result).toEqual(mockApplication);
      expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaService.application.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Order Service',
            userId: mockUser.id,
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return only user applications for regular USER', async () => {
      const currentUser: JwtPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: Role.USER,
      };

      mockPrismaService.application.findMany.mockResolvedValue([mockApplication]);

      const result = await service.findAll(currentUser);

      expect(result).toEqual([mockApplication]);
      expect(mockPrismaService.application.findMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    });

    it('should return all applications for ADMIN', async () => {
      const currentAdmin: JwtPayload = {
        sub: mockAdmin.id,
        email: mockAdmin.email,
        role: Role.ADMIN,
      };

      mockPrismaService.application.findMany.mockResolvedValue([mockApplication]);

      const result = await service.findAll(currentAdmin);

      expect(result).toEqual([mockApplication]);
      expect(mockPrismaService.application.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    });
  });

  describe('findById', () => {
    it('should return application if regular USER is owner', async () => {
      const currentUser: JwtPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: Role.USER,
      };

      mockPrismaService.application.findUnique.mockResolvedValue(mockApplication);

      const result = await service.findById(mockApplication.id, currentUser);

      expect(result).toEqual(mockApplication);
      expect(mockPrismaService.application.findUnique).toHaveBeenCalledWith({
        where: { id: mockApplication.id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    });

    it('should return application if caller is ADMIN even if not owner', async () => {
      const currentAdmin: JwtPayload = {
        sub: mockAdmin.id,
        email: mockAdmin.email,
        role: Role.ADMIN,
      };

      mockPrismaService.application.findUnique.mockResolvedValue(mockApplication);

      const result = await service.findById(mockApplication.id, currentAdmin);

      expect(result).toEqual(mockApplication);
      expect(mockPrismaService.application.findUnique).toHaveBeenCalledWith({
        where: { id: mockApplication.id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException if application does not exist', async () => {
      const currentUser: JwtPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: Role.USER,
      };

      mockPrismaService.application.findUnique.mockResolvedValue(null);

      await expect(
        service.findById('non-existent-id', currentUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if regular USER tries to view another user application', async () => {
      const currentUser: JwtPayload = {
        sub: 'different-user-id',
        email: 'other@example.com',
        role: Role.USER,
      };

      mockPrismaService.application.findUnique.mockResolvedValue(mockApplication);

      await expect(
        service.findById(mockApplication.id, currentUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update application if regular USER is owner', async () => {
      const currentUser: JwtPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: Role.USER,
      };

      mockPrismaService.application.findUnique.mockResolvedValue(mockApplication);
      mockPrismaService.application.update.mockResolvedValue({
        ...mockApplication,
        name: 'Updated Order Service',
        status: AppStatus.INACTIVE,
      });

      const result = await service.update(
        mockApplication.id,
        { name: 'Updated Order Service', status: AppStatus.INACTIVE },
        currentUser,
      );

      expect(result.name).toBe('Updated Order Service');
      expect(result.status).toBe(AppStatus.INACTIVE);
      expect(mockPrismaService.application.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockApplication.id },
          data: {
            name: 'Updated Order Service',
            status: AppStatus.INACTIVE,
          },
        }),
      );
    });

    it('should update application if caller is ADMIN even if not owner', async () => {
      const currentAdmin: JwtPayload = {
        sub: mockAdmin.id,
        email: mockAdmin.email,
        role: Role.ADMIN,
      };

      mockPrismaService.application.findUnique.mockResolvedValue(mockApplication);
      mockPrismaService.application.update.mockResolvedValue({
        ...mockApplication,
        name: 'Admin Renamed Service',
      });

      const result = await service.update(
        mockApplication.id,
        { name: 'Admin Renamed Service' },
        currentAdmin,
      );

      expect(result.name).toBe('Admin Renamed Service');
      expect(mockPrismaService.application.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if application to update does not exist', async () => {
      const currentUser: JwtPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: Role.USER,
      };

      mockPrismaService.application.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', { name: 'New Name' }, currentUser),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.application.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if regular USER tries to update another user application', async () => {
      const currentUser: JwtPayload = {
        sub: 'different-user-id',
        email: 'other@example.com',
        role: Role.USER,
      };

      mockPrismaService.application.findUnique.mockResolvedValue(mockApplication);

      await expect(
        service.update(mockApplication.id, { name: 'Hacked Name' }, currentUser),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrismaService.application.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete application if regular USER is owner', async () => {
      const currentUser: JwtPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: Role.USER,
      };

      mockPrismaService.application.findUnique.mockResolvedValue(mockApplication);
      mockPrismaService.application.delete.mockResolvedValue(mockApplication);

      const result = await service.delete(mockApplication.id, currentUser);

      expect(result).toHaveProperty('message', 'Xóa ứng dụng thành công');
      expect(result.application).toEqual(mockApplication);
      expect(mockPrismaService.application.delete).toHaveBeenCalledWith({
        where: { id: mockApplication.id },
      });
    });

    it('should delete application if caller is ADMIN even if not owner', async () => {
      const currentAdmin: JwtPayload = {
        sub: mockAdmin.id,
        email: mockAdmin.email,
        role: Role.ADMIN,
      };

      mockPrismaService.application.findUnique.mockResolvedValue(mockApplication);
      mockPrismaService.application.delete.mockResolvedValue(mockApplication);

      const result = await service.delete(mockApplication.id, currentAdmin);

      expect(result).toHaveProperty('message', 'Xóa ứng dụng thành công');
      expect(result.application).toEqual(mockApplication);
      expect(mockPrismaService.application.delete).toHaveBeenCalledWith({
        where: { id: mockApplication.id },
      });
    });

    it('should throw NotFoundException if application to delete does not exist', async () => {
      const currentUser: JwtPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: Role.USER,
      };

      mockPrismaService.application.findUnique.mockResolvedValue(null);

      await expect(
        service.delete('non-existent-id', currentUser),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.application.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if regular USER tries to delete another user application', async () => {
      const currentUser: JwtPayload = {
        sub: 'different-user-id',
        email: 'other@example.com',
        role: Role.USER,
      };

      mockPrismaService.application.findUnique.mockResolvedValue(mockApplication);

      await expect(
        service.delete(mockApplication.id, currentUser),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrismaService.application.delete).not.toHaveBeenCalled();
    });
  });
});
