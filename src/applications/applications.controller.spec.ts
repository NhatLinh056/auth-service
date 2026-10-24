import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppStatus, Role } from '../generated/prisma/enums.js';
import { JwtPayload } from '../common/strategies/jwt.strategy.js';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsService } from './applications.service.js';

describe('ApplicationsController', () => {
  let controller: ApplicationsController;
  let mockApplicationsService: {
    create: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
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
      findAll: vi.fn().mockResolvedValue([mockCreatedApplication]),
      findById: vi.fn().mockResolvedValue(mockCreatedApplication),
      update: vi.fn().mockResolvedValue({ ...mockCreatedApplication, name: 'Updated App' }),
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

  describe('findAll', () => {
    it('nên ủy quyền gọi applicationsService.findAll với currentUser chính xác', async () => {
      const result = await controller.findAll(mockUser);

      expect(mockApplicationsService.findAll).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual([mockCreatedApplication]);
    });
  });

  describe('findById', () => {
    it('nên ủy quyền gọi applicationsService.findById với id và currentUser chính xác', async () => {
      const result = await controller.findById('app-uuid-1', mockUser);

      expect(mockApplicationsService.findById).toHaveBeenCalledWith('app-uuid-1', mockUser);
      expect(result).toEqual(mockCreatedApplication);
    });
  });

  describe('update', () => {
    it('nên ủy quyền gọi applicationsService.update với id, DTO và currentUser chính xác', async () => {
      const dto = { name: 'Updated App' };

      const result = await controller.update('app-uuid-1', dto, mockUser);

      expect(mockApplicationsService.update).toHaveBeenCalledWith('app-uuid-1', dto, mockUser);
      expect(result.name).toBe('Updated App');
    });
  });

  describe('Security Metadata', () => {
    it('phương thức create nên có gắn Auth guard metadata', () => {
      const guards = Reflect.getMetadata('__guards__', controller.create);
      expect(guards).toBeDefined();
      expect(guards.length).toBeGreaterThanOrEqual(1);
    });

    it('phương thức findAll nên có gắn Auth guard metadata', () => {
      const guards = Reflect.getMetadata('__guards__', controller.findAll);
      expect(guards).toBeDefined();
      expect(guards.length).toBeGreaterThanOrEqual(1);
    });

    it('phương thức findById nên có gắn Auth guard metadata', () => {
      const guards = Reflect.getMetadata('__guards__', controller.findById);
      expect(guards).toBeDefined();
      expect(guards.length).toBeGreaterThanOrEqual(1);
    });

    it('phương thức update nên có gắn Auth guard metadata', () => {
      const guards = Reflect.getMetadata('__guards__', controller.update);
      expect(guards).toBeDefined();
      expect(guards.length).toBeGreaterThanOrEqual(1);
    });
  });
});
