import { beforeEach, describe, expect, it } from 'vitest';
import { Role } from '../generated/prisma/enums.js';
import { RolesService } from './roles.service.js';

describe('RolesService', () => {
  let service: RolesService;

  beforeEach(() => {
    service = new RolesService();
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
});
