import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUserProfile } from '../auth-client.service.js';

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUserProfile | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUserProfile;
    return data && user ? user[data] : user;
  },
);
