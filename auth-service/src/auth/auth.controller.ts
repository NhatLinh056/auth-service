import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppAuth } from '../common/decorators/app-auth.decorator.js';
import { CurrentApp } from '../common/decorators/current-app.decorator.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
