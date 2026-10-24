import { ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AppStatus } from '../../generated/prisma/enums.js';
import { getCurrentAppByContext } from './current-app.decorator.js';

describe('CurrentApp Decorator', () => {
  const mockApp = {
    id: 'app-uuid-1',
    name: 'Payment Service',
    appId: 'app_1234567890abcdef12345678',
    status: AppStatus.ACTIVE,
  };

  const createMockContext = (application?: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ application }),
      }),
    } as unknown as ExecutionContext;
  };

  it('nên trả về null nếu không có application trong request', () => {
    const context = createMockContext(undefined);
    const result = getCurrentAppByContext(undefined, context);
    expect(result).toBeNull();
  });

  it('nên trả về toàn bộ application object khi không truyền thuộc tính cụ thể', () => {
    const context = createMockContext(mockApp);
    const result = getCurrentAppByContext(undefined, context);
    expect(result).toEqual(mockApp);
  });

  it('nên trích xuất đúng trường "id" khi truyền data là "id"', () => {
    const context = createMockContext(mockApp);
    const result = getCurrentAppByContext('id', context);
    expect(result).toBe('app-uuid-1');
  });

  it('nên trích xuất đúng trường "name" khi truyền data là "name"', () => {
    const context = createMockContext(mockApp);
    const result = getCurrentAppByContext('name', context);
    expect(result).toBe('Payment Service');
  });

  it('nên trích xuất đúng trường "appId" khi truyền data là "appId"', () => {
    const context = createMockContext(mockApp);
    const result = getCurrentAppByContext('appId', context);
    expect(result).toBe('app_1234567890abcdef12345678');
  });
});
