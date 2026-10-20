import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../generated/prisma/enums.js';
import { RolesController } from './roles.controller.js';
import { RolesService } from './roles.service.js';

describe('RolesController', () => {
  let controller: RolesController;
  let mockRolesService: {
    getRoles: ReturnType<typeof vi.fn>;
    isValidRole: ReturnType<typeof vi.fn>;
    isAdmin: ReturnType<typeof vi.fn>;
    getAdminDashboard: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRolesService = {
      getRoles: vi.fn().mockReturnValue([
        { role: Role.ADMIN, name: 'Administrator', description: 'Admin' },
        { role: Role.USER, name: 'User', description: 'User' },
      ]),
      isValidRole: vi.fn(),
      isAdmin: vi.fn(),
      getAdminDashboard: vi.fn().mockResolvedValue({
        message: 'Chào mừng Quản trị viên đến bảng điều khiển hệ thống',
        stats: { totalUsers: 5, adminCount: 1, userCount: 4 },
      }),
    };
    controller = new RolesController(mockRolesService as unknown as RolesService);
  });

  it('nên được khởi tạo thành công', () => {
    expect(controller).toBeDefined();
  });

  describe('getRoles', () => {
    it('nên gọi rolesService.getRoles() và trả về danh sách role', () => {
      const result = controller.getRoles();
      expect(result).toHaveLength(2);
      expect(result[0]?.role).toBe(Role.ADMIN);
      expect(result[1]?.role).toBe(Role.USER);
    });
  });

  describe('getAdminDashboard', () => {
    it('nên trả về dashboard cho admin cùng với thông tin currentUser', async () => {
      const mockReq = {
        user: {
          sub: 'admin-uuid',
          email: 'admin@system.com',
          role: Role.ADMIN,
        },
      } as any;

      const result = await controller.getAdminDashboard(mockReq);

      expect(mockRolesService.getAdminDashboard).toHaveBeenCalledTimes(1);
      expect(result).toHaveProperty('message');
      expect(result.stats).toEqual({ totalUsers: 5, adminCount: 1, userCount: 4 });
      expect(result.currentUser).toEqual({
        id: 'admin-uuid',
        email: 'admin@system.com',
        role: Role.ADMIN,
      });
    });
  });
});
