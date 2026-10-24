import { describe, expect, it } from 'vitest';
import { IS_PUBLIC_KEY, Public } from './public.decorator.js';

describe('Public Decorator', () => {
  class TestController {
    @Public()
    publicMethod() {}

    privateMethod() {}
  }

  it('nên gán IS_PUBLIC_KEY = true trên method được gắn @Public()', () => {
    const isPublic = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      TestController.prototype.publicMethod,
    );
    expect(isPublic).toBe(true);
  });

  it('nên trả về undefined trên method không gắn @Public()', () => {
    const isPublic = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      TestController.prototype.privateMethod,
    );
    expect(isPublic).toBeUndefined();
  });
});
