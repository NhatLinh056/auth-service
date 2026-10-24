import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppStatus, Role } from '../generated/prisma/enums.js';
import { JwtPayload } from '../common/strategies/jwt.strategy.js';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsService } from './applications.service.js';

describe('ApplicationsController', () => {
  let controller: ApplicationsController;
  let mockApplicationsService: {
    create: ReturnType<typeof vi.fn>;
  };

  const mockUser: JwtPayload = {
    sub: 'user-uuid-1',
    email: 'user@example.com',
    role: Role.USER,
  };

  const mockCreatedApplication = {
    id: 'app-uuid-1',
    name: 'Notification Service',
    appId: 'app_1234567890abcdef',
    appToken: 'apt_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    status: AppStatus.ACTIVE,
    userId: 'user-uuid-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockApplicationsService = {
      create: vi.fn().mockResolvedValue(mockCreatedApplication),
    };

    controller = new ApplicationsController(
      mockApplicationsService as unknown as ApplicationsService,
    );
  });

  it('nên được khởi tạo thành công', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('nên ủy quyền gọi applicationsService.create với DTO và currentUser chính xác', async () => {
      const dto = { name: 'Notification Service' };

      const result = await controller.create(dto, mockUser);

      expect(mockApplicationsService.create).toHaveBeenCalledWith(dto, mockUser);
      expect(result).toEqual(mockCreatedApplication);
    });
  });

  describe('Security Metadata', () => {
    it('phương thức create nên có gắn Auth guard metadata', () => {
      const guards = Reflect.getMetadata('__guards__', controller.create);
      expect(guards).toBeDefined();
      expect(guards.length).toBeGreaterThanOrEqual(1);
    });
  });
});
