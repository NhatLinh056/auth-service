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
import { Auth } from '../common/decorators/auth.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../common/strategies/jwt.strategy.js';
import { UpdateOAuthProviderDto } from './dto/update-oauth-provider.dto.js';
import {
  OAuthProvidersService,
  SanitizedOAuthProvider,
} from './oauth-providers.service.js';

@ApiTags('application-auth-methods')
@Controller('applications/:id/auth-methods')
@Auth()
export class OAuthProvidersController {
  constructor(private readonly oauthProvidersService: OAuthProvidersService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách cấu hình Sign-in Methods của một Application (Chủ sở hữu hoặc ADMIN)',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID của Application (Project)',
    example: 'c2d35984-2b0c-4e51-a8af-9a924db63e19',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các provider của ứng dụng (clientSecret đã được che giấu an toàn)',
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập ứng dụng của người khác' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ứng dụng' })
  findAll(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<SanitizedOAuthProvider[]> {
    return this.oauthProvidersService.findAllByApplication(id, currentUser);
  }

  @Get(':provider')
  @ApiOperation({
    summary: 'Lấy thông tin chi tiết một Sign-in Method của Application (Chủ sở hữu hoặc ADMIN)',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID của Application (Project)',
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
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập ứng dụng của người khác' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ứng dụng hoặc provider' })
  findByProvider(
    @Param('id') id: string,
    @Param('provider') provider: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<SanitizedOAuthProvider> {
    return this.oauthProvidersService.findByProvider(id, provider, currentUser);
  }

  @Patch(':provider')
  @ApiOperation({
    summary: 'Cập nhật cấu hình Sign-in Method của Application (Chủ sở hữu hoặc ADMIN)',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID của Application (Project)',
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
  @ApiResponse({ status: 403, description: 'Không có quyền cập nhật ứng dụng của người khác' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ứng dụng hoặc provider' })
  update(
    @Param('id') id: string,
    @Param('provider') provider: string,
    @Body() dto: UpdateOAuthProviderDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<SanitizedOAuthProvider> {
    return this.oauthProvidersService.update(id, provider, dto, currentUser);
  }

  @Post(':provider/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bật / Tắt nhanh một Sign-in Method của Application (Chủ sở hữu hoặc ADMIN)',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID của Application (Project)',
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
  @ApiResponse({ status: 403, description: 'Không có quyền thay đổi ứng dụng của người khác' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ứng dụng hoặc provider' })
  toggle(
    @Param('id') id: string,
    @Param('provider') provider: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<SanitizedOAuthProvider> {
    return this.oauthProvidersService.toggle(id, provider, currentUser);
  }
}
