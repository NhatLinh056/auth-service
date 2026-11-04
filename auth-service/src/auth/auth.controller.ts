import {
  Body,
  Header,
  Req,
  UnauthorizedException,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OAuthGrantsService } from './oauth-grants.service.js';
import type { Request } from 'express';
import type { Response } from 'express';
import { AppAuth } from '../common/decorators/app-auth.decorator.js';
import { CurrentApp } from '../common/decorators/current-app.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ExchangeOAuthDto } from './dto/exchange-oauth.dto.js';
import { SetPasswordDto } from './dto/set-password.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../common/strategies/jwt.strategy.js';
import { OAuthService } from './oauth.service.js';
import { AccountOAuthService } from './account-oauth.service.js';
import { getAuthPublicUrl } from './oauth-public-url.js';
import { LoginFlowService } from './login-flow.service.js';
import { Auth } from '../common/decorators/auth.decorator.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
    private readonly grants: OAuthGrantsService,
    private readonly accountOAuth: AccountOAuthService,
    private readonly loginFlows: LoginFlowService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Đăng ký tài khoản người dùng mới' })
  @ApiResponse({
    status: 201,
    description: 'Đăng ký tài khoản thành công',
  })
  @ApiResponse({
    status: 409,
    description: 'Email đã được đăng ký trong hệ thống',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu gửi lên không hợp lệ (sai định dạng email, mật khẩu ngắn)',
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập người dùng và nhận JWT Access Token' })
  @ApiResponse({
    status: 200,
    description: 'Đăng nhập thành công, trả về access token và thông tin user',
  })
  @ApiResponse({
    status: 401,
    description: 'Email hoặc mật khẩu không chính xác',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu gửi lên không hợp lệ (email sai định dạng, thiếu password)',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng xuất người dùng (stateless JWT — client tự xóa token)' })
  @ApiResponse({
    status: 200,
    description: 'Đăng xuất thành công',
  })
  logout() {
    return this.authService.logout();
  }

  @Post('account/password')
  @Auth()
  @HttpCode(HttpStatus.OK)
  setPassword(@Body() dto: SetPasswordDto, @CurrentUser() user: JwtPayload) {
    return this.authService.setPassword(user.sub, dto);
  }

  @Get('providers')
  @Public()
  @ApiOperation({
    summary: 'Lấy danh sách các phương thức đăng nhập OAuth khả dụng (Công khai cho Client/Frontend)',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các provider cùng trạng thái enabled/disabled',
  })
  getProviders(
    @Query('app_id') appId?: string,
    @Headers('x-app-id') headerAppId?: string,
  ) {
    const targetAppId = appId || headerAppId;
    return this.authService.getPublicProviders(targetAppId);
  }

  @Get('oauth/preflight/:provider')
  @AppAuth()
  async preflightOAuth(
    @Param('provider') provider: string,
    @Query('redirect_uri') redirectUri: string,
    @CurrentApp() app: any,
  ) {
    await this.oauthService.checkOAuthAvailability(provider, app.appId, redirectUri);
    return { ready: true };
  }

  @Get('oauth/:provider')
  @Public()
  @ApiOperation({
    summary: 'Khởi tạo luồng đăng nhập OAuth 2.0 (Redirect người dùng sang Google hoặc Facebook)',
  })
  @ApiParam({
    name: 'provider',
    description: 'Tên nhà cung cấp (google hoặc facebook)',
    example: 'google',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect sang trang xác thực của OAuth Provider',
  })
  @ApiResponse({
    status: 400,
    description: 'Provider bị vô hiệu hóa hoặc chưa được cấu hình đầy đủ',
  })
  async initiateOAuth(
    @Param('provider') provider: string,
    @Query('redirect_uri') redirectUri: string,
    @Res() res: Response,
    @Query('app_id') appId?: string,
    @Query('code_challenge') codeChallenge?: string,
    @Query('state') clientState?: string,
  ) {
    const authUrl = await this.oauthService.getAuthorizationUrl(provider, redirectUri, appId, codeChallenge, undefined, clientState);
    const state = new URL(authUrl).searchParams.get('state')!;
    res.cookie('oauth_state', state, {
      httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
      path: '/auth/oauth', maxAge: 600000,
    });
    return res.redirect(authUrl);
  }

  @Get('oauth/:provider/callback')
  @Public()
  @ApiOperation({
    summary: 'Tiếp nhận Authorization Code callback từ Provider sau khi người dùng đồng ý',
  })
  @ApiParam({
    name: 'provider',
    description: 'Tên nhà cung cấp (google hoặc facebook)',
    example: 'google',
  })
  @ApiResponse({
    status: 302,
    description: 'Xác thực thành công, redirect về client kèm Access Token',
  })
  @ApiResponse({
    status: 401,
    description: 'Xác thực OAuth thất bại (sai state, từ chối cấp quyền, token hết hạn)',
  })
  async handleOAuthCallback(
    @Param('provider') provider: string,
    @Query() query: { code?: string; state?: string; error?: string; error_description?: string },
    @Res() res: Response,
    @Req() req: Request,
  ) {
    if (await this.accountOAuth.isAccountState(query.state)) {
      const accountCookie = (req.headers.cookie || '').split(';').map(value => value.trim())
        .find(value => value.startsWith('account_oauth_state='))?.slice('account_oauth_state='.length);
      res.clearCookie('account_oauth_state', { path: '/auth/oauth' });
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Referrer-Policy', 'no-referrer');
      try {
        const code = await this.accountOAuth.callback(provider, query, accountCookie);
        return res.redirect(`${getAuthPublicUrl()}/?account_code=${encodeURIComponent(code)}#account`);
      } catch {
        return res.redirect(`${getAuthPublicUrl()}/?account_link_error=${query.error ? 'cancelled' : 'failed'}#account`);
      }
    }
    const cookie = (req.headers.cookie || '').split(';').map(v => v.trim())
      .find(v => v.startsWith('oauth_state='))?.slice('oauth_state='.length);
    res.clearCookie('oauth_state', { path: '/auth/oauth' });
    if (!query.state || !cookie || encodeURIComponent(query.state) !== cookie) {
      throw new UnauthorizedException('OAuth browser session mismatch');
    }
    let result;
    try {
      result = await this.oauthService.handleCallback(provider, query);
    } catch (error) {
      const redirectUri = await this.oauthService.getErrorRedirectUri(query.state, provider);
      if (!redirectUri) throw error;
      const targetUrl = new URL(redirectUri);
      targetUrl.searchParams.set('error', query.error ? 'oauth_cancelled' : 'oauth_failed');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Referrer-Policy', 'no-referrer');
      return res.redirect(targetUrl.toString());
    }
    if (result.flowId) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Referrer-Policy', 'no-referrer');
      return res.redirect(await this.loginFlows.acceptOAuth(result));
    }
    const code = this.grants.issue(result, result.appId, result.codeChallenge);
    const targetUrl = new URL(result.redirectUri);
    targetUrl.searchParams.set('code', code);
    if (result.clientState) targetUrl.searchParams.set('state', result.clientState);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    return res.redirect(targetUrl.toString());
  }

  @Header('Cache-Control', 'no-store')
  @Post('oauth/exchange')
  @HttpCode(HttpStatus.OK)
  @AppAuth()
  exchangeOAuthCode(@Body() body: ExchangeOAuthDto, @CurrentApp() app: any) {
    return this.grants.exchange(body.code, body.verifier, app.appId);
  }

  @Get('verify-service')
  @AppAuth()
  @ApiOperation({
    summary: 'Xác thực định danh Microservice liên thông qua X-App-Id và X-App-Token',
  })
  @ApiResponse({
    status: 200,
    description: 'Xác thực Microservice thành công, trả về thông tin ứng dụng',
  })
  verifyService(@CurrentApp() app: any) {
    return {
      valid: true,
      message: 'Xác thực dịch vụ thành công',
      application: {
        id: app.id,
        name: app.name,
        appId: app.appId,
        status: app.status,
        adminEmails: app.adminEmails || [],
        userId: app.userId,
        user: app.user,
      },
    };
  }
}
