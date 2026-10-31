import {
  Body,
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
import type { Response } from 'express';
import { AppAuth } from '../common/decorators/app-auth.decorator.js';
import { CurrentApp } from '../common/decorators/current-app.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { OAuthService } from './oauth.service.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
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
  ) {
    const authUrl = appId
      ? await this.oauthService.getAuthorizationUrl(provider, redirectUri, appId)
      : await this.oauthService.getAuthorizationUrl(provider, redirectUri);
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
    @Query()
    query: {
      code?: string;
      state?: string;
      error?: string;
      error_description?: string;
      format?: string;
    },
    @Res() res: Response,
  ) {
    try {
      const result = await this.oauthService.handleCallback(provider, query);

      // Hỗ trợ trả JSON trực tiếp cho API test / E2E test
      if (query.format === 'json') {
        return res.status(HttpStatus.OK).json({
          accessToken: result.accessToken,
          user: result.user,
          redirectUri: result.redirectUri,
        });
      }

      // Luồng mặc định: Redirect về redirectUri của Client (Project 2 / Web UI) kèm token
      const targetUrl = new URL(result.redirectUri);
      targetUrl.searchParams.set('token', result.accessToken);
      targetUrl.searchParams.set('email', result.user.email);
      if (result.user.name) {
        targetUrl.searchParams.set('name', result.user.name);
      }
      targetUrl.searchParams.set('role', result.user.role);
      targetUrl.searchParams.set('provider', (result.user.provider || provider).toLowerCase());
      if (result.user.avatarUrl) {
        targetUrl.searchParams.set('avatar', result.user.avatarUrl);
      }

      return res.redirect(targetUrl.toString());
    } catch (err: any) {
      // Nếu API client yêu cầu format JSON (như trong các bài test) thì ném lỗi bình thường
      if (query.format === 'json') {
        throw err;
      }

      // Trích xuất client redirect URI từ OAuth state token
      const clientRedirectUri = this.oauthService.extractRedirectUriFromState(query.state);
      const targetUrl = new URL(clientRedirectUri);

      // Truyền thông điệp lỗi về Frontend để hiển thị Toast thông báo thân thiện
      const errorMessage =
        query.error_description ||
        query.error ||
        err?.message ||
        'OAuth authentication was cancelled';
      targetUrl.searchParams.set('error', errorMessage);

      return res.redirect(targetUrl.toString());
    }
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
        userId: app.userId,
        user: app.user,
      },
    };
  }
}
