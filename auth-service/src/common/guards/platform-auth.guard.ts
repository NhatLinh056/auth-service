import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard.js';

/** Platform authorization must never accept an application-scoped identity. */
@Injectable()
export class PlatformAuthGuard extends JwtAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    if (context.switchToHttp().getRequest().user?.type !== 'platform') {
      throw new ForbiddenException('Platform identity required');
    }
    return true;
  }
}
