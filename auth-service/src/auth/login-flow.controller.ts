import { Body, Controller, Get, Header, HttpCode, Param, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';
import type { Response } from 'express';
import { AppAuth } from '../common/decorators/app-auth.decorator.js';
import { Auth } from '../common/decorators/auth.decorator.js';
import { CurrentApp } from '../common/decorators/current-app.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../common/strategies/jwt.strategy.js';
import { LoginDto } from './dto/login.dto.js';
import { ConfirmOAuthDto } from './dto/exchange-oauth.dto.js';
import { LoginFlowService } from './login-flow.service.js';

class CreateFlowDto {
  @IsString() @MaxLength(2048) redirectUri: string;
  @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) codeChallenge: string;
  @IsString() @Matches(/^[A-Za-z0-9_-]{32,128}$/) state: string;
}
class BeginFlowDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) codeChallenge: string;
}

@ApiTags('login-flows')
@Controller('auth/flows')
export class LoginFlowController {
  constructor(private readonly flows: LoginFlowService) {}

  @Post()
  @AppAuth()
  @ApiOperation({ summary: 'Khởi tạo phiên đăng nhập tập trung (Centralized Login Flow) cho ứng dụng' })
  @ApiResponse({ status: 201, description: 'Tạo luồng đăng nhập thành công, trả về authorizeUrl' })
  create(@CurrentApp() app: any, @Body() dto: CreateFlowDto) {
    return this.flows.create(app.appId, dto.redirectUri, dto.codeChallenge, dto.state);
  }

  @Get('oauth/start')
  @ApiOperation({ summary: 'Chuyển hướng OAuth Provider cho luồng đăng nhập tập trung' })
  async start(@Query('ticket') ticket: string, @Res() res: Response) {
    const result = await this.flows.oauthStart(ticket);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.cookie('oauth_state', result.state, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/auth/oauth', maxAge: 600000 });
    return res.redirect(result.url);
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết cấu hình và tùy chọn đăng nhập của Flow' })
  @ApiParam({ name: 'id', description: 'Flow ID' })
  details(@Param('id') id: string) { return this.flows.details(id); }

  @Post(':id/password')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Xác thực email/mật khẩu trong trang đăng nhập tập trung' })
  @ApiParam({ name: 'id', description: 'Flow ID' })
  password(@Param('id') id: string, @Body() dto: LoginDto) { return this.flows.password(id, dto.email, dto.password); }

  @Post(':id/session')
  @Auth()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Xác thực nhanh bằng phiên đăng nhập nền tảng (SSO Session)' })
  @ApiParam({ name: 'id', description: 'Flow ID' })
  session(@Param('id') id: string, @CurrentUser() user: JwtPayload) { return this.flows.session(id, user.sub); }

  @Post(':id/oauth/:provider/begin')
  @ApiOperation({ summary: 'Bắt đầu ủy quyền OAuth qua Provider trong flow' })
  @ApiParam({ name: 'id', description: 'Flow ID' })
  @ApiParam({ name: 'provider', description: 'Tên provider (google / facebook)' })
  begin(@Param('id') id: string, @Param('provider') provider: string, @Body() dto: BeginFlowDto) {
    return this.flows.oauthBegin(id, provider, dto.codeChallenge);
  }

  @Post(':id/oauth/complete')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Hoàn tất ủy quyền OAuth và trả về mã Authorization Code cho client' })
  @ApiParam({ name: 'id', description: 'Flow ID' })
  complete(@Param('id') id: string, @Body() dto: ConfirmOAuthDto) {
    return this.flows.oauthComplete(id, dto.code, dto.verifier, { password: dto.password, linkToken: dto.linkToken });
  }
}
