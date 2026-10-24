import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthClientService } from '../auth-client.service.js';

@Injectable()
export class UserAuthGuard implements CanActivate {
  constructor(private readonly authClientService: AuthClientService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header (expected Bearer token)');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new UnauthorizedException('Bearer token is empty');
    }

    // Delegate token verification to Auth Service
    const user = await this.authClientService.verifyUserToken(token);
    request.user = user;

    return true;
  }
}
