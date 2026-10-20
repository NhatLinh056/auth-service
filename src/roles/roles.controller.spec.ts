import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../generated/prisma/enums.js';
import { RolesController } from './roles.controller.js';
import { RolesService } from './roles.service.js';

describe('RolesController', () => {
  let controller: RolesController;
  let service: RolesService;

  beforeEach(() => {
    service = new RolesService();
    controller = new RolesController(service);
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
});
