import { describe, expect, it } from 'vitest';
import { Role } from '../../generated/prisma/enums.js';
import { ROLES_KEY } from './roles.decorator.js';
import { Auth, AuthOwnerOrAdmin } from './auth.decorator.js';

describe('Auth Decorator (Authentication vs Authorization)', () => {
  class TestController {
    @Auth()
    onlyAuthenticationMethod() {}

    @Auth(Role.ADMIN)
    adminAuthorizationMethod() {}

    @Auth(Role.USER, Role.ADMIN)
    multipleRolesMethod() {}

    @AuthOwnerOrAdmin()
    ownerOrAdminMethod() {}
  }

  it('nên không gán ROLES_KEY metadata khi endpoint chỉ yêu cầu Authentication (@Auth())', () => {
    const rolesMetadata = Reflect.getMetadata(
      ROLES_KEY,
      TestController.prototype.onlyAuthenticationMethod,
    );
    expect(rolesMetadata).toBeUndefined();
  });

  it('nên gán ROLES_KEY metadata [ADMIN] khi endpoint yêu cầu quyền ADMIN (@Auth(Role.ADMIN))', () => {
    const rolesMetadata = Reflect.getMetadata(
      ROLES_KEY,
      TestController.prototype.adminAuthorizationMethod,
    );
    expect(rolesMetadata).toEqual([Role.ADMIN]);
  });

  it('nên gán ROLES_KEY metadata [USER, ADMIN] khi endpoint cho phép nhiều vai trò', () => {
    const rolesMetadata = Reflect.getMetadata(
      ROLES_KEY,
      TestController.prototype.multipleRolesMethod,
    );
    expect(rolesMetadata).toEqual([Role.USER, Role.ADMIN]);
  });

  it('nên khởi tạo AuthOwnerOrAdmin decorator thành công và gắn guard phù hợp', () => {
    const guards = Reflect.getMetadata(
      '__guards__',
      TestController.prototype.ownerOrAdminMethod,
    );
    expect(guards).toBeDefined();
    expect(guards.length).toBe(2);
  });
});
