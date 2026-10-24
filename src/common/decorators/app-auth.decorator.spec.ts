import { describe, expect, it } from 'vitest';
import { AppAuthGuard } from '../guards/app-auth.guard.js';
import { AppAuth } from './app-auth.decorator.js';

describe('AppAuth Decorator', () => {
  class TestController {
    @AppAuth()
    testMethod() {}
  }

  it('nên gán AppAuthGuard vào danh sách guards của phương thức', () => {
    const guards = Reflect.getMetadata(
      '__guards__',
      TestController.prototype.testMethod,
    );
    expect(guards).toBeDefined();
    expect(guards).toContain(AppAuthGuard);
  });
});
