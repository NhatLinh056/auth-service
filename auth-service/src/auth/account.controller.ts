import { Body, Controller, Get, Header, Param, Post, Query, Res } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Auth } from '../common/decorators/auth.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../common/strategies/jwt.strategy.js';
import { AccountOAuthService } from './account-oauth.service.js';
import { getAuthPublicUrl } from './oauth-public-url.js';

class StartAccountLinkDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  codeChallenge: string;
}
class CompleteAccountLinkDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  code: string;

  @IsString()
  @Matches(/^[A-Za-z0-9._~-]{43,128}$/)
  verifier: string;
}

@ApiTags('account')
@Controller('auth/account')
export class AccountController {
  constructor(private readonly accounts: AccountOAuthService) {}

  @Get()
  @Auth()
  @Header('Cache-Control', 'no-store')
  profile(@CurrentUser() user: JwtPayload) { return this.accounts.profile(user.sub); }

  @Post('oauth/:provider/begin')
  @Auth()
  @Header('Cache-Control', 'no-store')
  begin(@CurrentUser() user: JwtPayload, @Param('provider') provider: string, @Body() dto: StartAccountLinkDto) {
    return this.accounts.begin(user.sub, provider, dto.codeChallenge);
  }

  @Get('oauth/start')
  async start(@Query('ticket') ticket: string, @Res() response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    try {
      const result = await this.accounts.start(ticket);
      response.cookie('account_oauth_state', result.state, {
        httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/auth/oauth', maxAge: 600000,
      });
      return response.redirect(result.url);
    } catch { return response.redirect(`${getAuthPublicUrl()}/?account_link_error=expired#account`); }
  }

  @Post('oauth/complete')
  @Auth()
  @Header('Cache-Control', 'no-store')
  complete(@CurrentUser() user: JwtPayload, @Body() dto: CompleteAccountLinkDto) {
    return this.accounts.complete(user.sub, dto.code, dto.verifier);
  }
}
