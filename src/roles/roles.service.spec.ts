import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RolesService } from './roles.service.js';

describe('RolesService', () => {
  let service: RolesService;
  let mockPrismaService: {
    user: {
      count: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrismaService = {
      user: {
        count: vi.fn(),
      },
    };
    service = new RolesService(mockPrismaService as unknown as PrismaService);
  });

  it('nên được khởi tạo thành công', () => {
    expect(service).toBeDefined();
  });

  describe('getRoles', () => {
    it('nên trả về danh sách role gồm ADMIN và USER', () => {
      const roles = service.getRoles();
      expect(roles).toHaveLength(2);

      const roleKeys = roles.map((r) => r.role);
      expect(roleKeys).toContain(Role.ADMIN);
      expect(roleKeys).toContain(Role.USER);
    });
  });

  describe('isValidRole', () => {
    it('nên trả về true với role ADMIN', () => {
      expect(service.isValidRole('ADMIN')).toBe(true);
    });

    it('nên trả về true với role USER', () => {
      expect(service.isValidRole('USER')).toBe(true);
    });

    it('nên trả về false với role không tồn tại', () => {
      expect(service.isValidRole('SUPERADMIN')).toBe(false);
      expect(service.isValidRole('MANAGER')).toBe(false);
      expect(service.isValidRole('')).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('nên trả về true nếu role là ADMIN', () => {
      expect(service.isAdmin(Role.ADMIN)).toBe(true);
      expect(service.isAdmin('ADMIN')).toBe(true);
    });

    it('nên trả về false nếu role không phải ADMIN', () => {
      expect(service.isAdmin(Role.USER)).toBe(false);
      expect(service.isAdmin('USER')).toBe(false);
      expect(service.isAdmin('GUEST')).toBe(false);
    });
  });

  describe('getAdminDashboard', () => {
    it('nên trả về thống kê người dùng cho Admin', async () => {
      mockPrismaService.user.count
        .mockResolvedValueOnce(10) // totalUsers
        .mockResolvedValueOnce(2)  // adminCount
        .mockResolvedValueOnce(8);  // userCount

      const result = await service.getAdminDashboard();

      expect(result).toHaveProperty('message');
      expect(result.stats).toEqual({
        totalUsers: 10,
        adminCount: 2,
        userCount: 8,
      });
      expect(mockPrismaService.user.count).toHaveBeenCalledTimes(3);
    });
  });
});
