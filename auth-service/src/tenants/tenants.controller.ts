import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { JwtPayload } from '../common/strategies/jwt.strategy.js';
import { CreateTenantDto, JoinTenantDto, RejectJoinRequestDto, TransferTenantDto, UpdateTenantDto } from './tenant.dto.js';
import { TenantsService, type TenantActor } from './tenants.service.js';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}
  private actor(user: JwtPayload): TenantActor {
    return {
      id: user.type === 'platform' ? user.sub : (user.userId || user.sub),
      type: user.type || 'platform',
    };
  }

  @Get('me')
  @ApiOperation({ summary: 'Lấy thông tin Tenant hiện tại của người dùng đang đăng nhập' })
  @ApiResponse({ status: 200, description: 'Trả về thông tin Tenant hoặc null nếu chưa tham gia' })
  me(@CurrentUser() user: JwtPayload) { return this.tenants.me(this.actor(user)); }

  @Get('audit')
  @ApiOperation({ summary: 'Lấy nhật ký can thiệp (Audit Logs) của Tenant người dùng (hoặc toàn cục nếu Admin)' })
  audit(@CurrentUser() user: JwtPayload) { return this.tenants.audit(this.actor(user)); }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách các Tenant (System Admin xem tất cả, User xem khám phá)' })
  list(@CurrentUser() user: JwtPayload) { return this.tenants.list(this.actor(user)); }

  @Post()
  @ApiOperation({ summary: 'Tạo một Tenant mới (người tạo tự động làm Tenant Owner)' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTenantDto) { return this.tenants.create(this.actor(user), dto); }

  @Post('join')
  @ApiOperation({ summary: 'Gửi yêu cầu xin gia nhập vào một Tenant' })
  applyJoin(@CurrentUser() user: JwtPayload, @Body() dto: JoinTenantDto) {
    return this.tenants.applyJoin(this.actor(user), dto);
  }

  @Get('join-request/my')
  @ApiOperation({ summary: 'Xem yêu cầu gia nhập Tenant đang chờ duyệt của mình' })
  myJoinRequest(@CurrentUser() user: JwtPayload) {
    return this.tenants.myJoinRequest(this.actor(user));
  }

  @Post('join-request/:id/cancel')
  @ApiOperation({ summary: 'Hủy yêu cầu xin gia nhập đang chờ' })
  @ApiParam({ name: 'id', description: 'UUID của yêu cầu gia nhập' })
  cancelJoinRequest(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.tenants.cancelJoinRequest(this.actor(user), id);
  }

  @Post('join-requests/:id/approve')
  @ApiOperation({ summary: 'Duyệt yêu cầu xin gia nhập (Chỉ Tenant Owner)' })
  @ApiParam({ name: 'id', description: 'UUID của yêu cầu gia nhập' })
  approveJoinRequest(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.tenants.approveJoinRequest(this.actor(user), id);
  }

  @Post('join-requests/:id/reject')
  @ApiOperation({ summary: 'Từ chối yêu cầu xin gia nhập kèm lý do (Chỉ Tenant Owner)' })
  @ApiParam({ name: 'id', description: 'UUID của yêu cầu gia nhập' })
  rejectJoinRequest(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectJoinRequestDto,
  ) {
    return this.tenants.rejectJoinRequest(this.actor(user), id, dto);
  }

  @Post('leave')
  @ApiOperation({ summary: 'Rời khỏi Tenant hiện tại (Dành cho Tenant Member)' })
  leave(@CurrentUser() user: JwtPayload) {
    return this.tenants.leave(this.actor(user));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem thông tin chi tiết một Tenant theo ID' })
  @ApiParam({ name: 'id', description: 'UUID của Tenant' })
  detail(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) { return this.tenants.detail(this.actor(user), id); }

  @Get(':id/join-requests')
  @ApiOperation({ summary: 'Xem danh sách yêu cầu xin gia nhập của Tenant (Chỉ Tenant Owner)' })
  @ApiParam({ name: 'id', description: 'UUID của Tenant' })
  listJoinRequests(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.tenants.listJoinRequests(this.actor(user), id);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Xóa thành viên khỏi Tenant (Chỉ Tenant Owner)' })
  @ApiParam({ name: 'id', description: 'UUID của Tenant' })
  @ApiParam({ name: 'userId', description: 'UUID của người dùng cần xóa' })
  removeMember(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.tenants.removeMember(this.actor(user), id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật tên hoặc mô tả của Tenant (Chỉ Tenant Owner)' })
  @ApiParam({ name: 'id', description: 'UUID của Tenant' })
  update(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTenantDto) {
    return this.tenants.update(this.actor(user), id, dto);
  }

  @Post(':id/transfer')
  @ApiOperation({ summary: 'Chuyển giao quyền chủ sở hữu Tenant cho thành viên khác (Chỉ Tenant Owner)' })
  @ApiParam({ name: 'id', description: 'UUID của Tenant' })
  transfer(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: TransferTenantDto) {
    return this.tenants.transfer(this.actor(user), id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa hoàn toàn Tenant (Tenant Owner hoặc Platform Admin)' })
  @ApiParam({ name: 'id', description: 'UUID của Tenant' })
  delete(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) { return this.tenants.delete(this.actor(user), id); }

  @Get(':id/audit')
  @ApiOperation({ summary: 'Xem lịch sử nhật ký can thiệp của Tenant theo ID' })
  @ApiParam({ name: 'id', description: 'UUID của Tenant' })
  tenantAudit(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) { return this.tenants.audit(this.actor(user), id); }
}
