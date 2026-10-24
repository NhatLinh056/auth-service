import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../generated/prisma/enums.js';
import { Auth } from '../common/decorators/auth.decorator.js';
import { UpdateOAuthProviderDto } from './dto/update-oauth-provider.dto.js';
import {
  OAuthProvidersService,
  SanitizedOAuthProvider,
} from './oauth-providers.service.js';

@ApiTags('oauth-providers')
@Controller('oauth-providers')
@Auth(Role.ADMIN)
export class OAuthProvidersController {
  constructor(private readonly oauthProvidersService: OAuthProvidersService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách cấu hình tất cả OAuth Providers (Chỉ ADMIN)',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các provider (clientSecret đã được che giấu an toàn)',
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Yêu cầu quyền ADMIN' })
  findAll(): Promise<SanitizedOAuthProvider[]> {
    return this.oauthProvidersService.findAll();
  }

  @Get(':provider')
  @ApiOperation({
    summary: 'Lấy thông tin chi tiết một OAuth Provider (Chỉ ADMIN)',
  })
  @ApiParam({
    name: 'provider',
    description: 'Tên nhà cung cấp (google hoặc facebook)',
    example: 'google',
  })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết cấu hình provider (clientSecret được che giấu)',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy provider' })
  findByProvider(@Param('provider') provider: string): Promise<SanitizedOAuthProvider> {
    return this.oauthProvidersService.findByProvider(provider);
  }

  @Patch(':provider')
  @ApiOperation({
    summary: 'Cập nhật cấu hình OAuth Provider (Chỉ ADMIN)',
  })
  @ApiParam({
    name: 'provider',
    description: 'Tên nhà cung cấp (google hoặc facebook)',
    example: 'google',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công, trả về cấu hình an toàn',
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy provider' })
  update(
    @Param('provider') provider: string,
    @Body() dto: UpdateOAuthProviderDto,
  ): Promise<SanitizedOAuthProvider> {
    return this.oauthProvidersService.update(provider, dto);
  }

  @Post(':provider/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bật / Tắt nhanh một OAuth Provider (Chỉ ADMIN)',
  })
  @ApiParam({
    name: 'provider',
    description: 'Tên nhà cung cấp (google hoặc facebook)',
    example: 'google',
  })
  @ApiResponse({
    status: 200,
    description: 'Thay đổi trạng thái thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Không thể bật nếu chưa cấu hình Client ID và Secret',
  })
  toggle(@Param('provider') provider: string): Promise<SanitizedOAuthProvider> {
    return this.oauthProvidersService.toggle(provider);
  }
}
