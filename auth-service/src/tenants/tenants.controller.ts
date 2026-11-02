import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { JwtPayload } from '../common/strategies/jwt.strategy.js';
import { CreateTenantDto, JoinTenantDto, RejectJoinRequestDto, TransferTenantDto, UpdateTenantDto } from './tenant.dto.js';
import { TenantsService } from './tenants.service.js';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}
  private actor(user: JwtPayload) { return user.type === 'platform' ? user.sub : user.userId!; }

  @Get('me')
  me(@CurrentUser() user: JwtPayload) { return this.tenants.me(this.actor(user)); }

  @Get('audit')
  audit(@CurrentUser() user: JwtPayload) { return this.tenants.audit(this.actor(user)); }

  @Get()
  list(@CurrentUser() user: JwtPayload) { return this.tenants.list(this.actor(user)); }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTenantDto) { return this.tenants.create(this.actor(user), dto); }

  @Post('join')
  applyJoin(@CurrentUser() user: JwtPayload, @Body() dto: JoinTenantDto) {
    return this.tenants.applyJoin(this.actor(user), dto);
  }

  @Get('join-request/my')
  myJoinRequest(@CurrentUser() user: JwtPayload) {
    return this.tenants.myJoinRequest(this.actor(user));
  }

  @Post('join-request/:id/cancel')
  cancelJoinRequest(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.tenants.cancelJoinRequest(this.actor(user), id);
  }

  @Post('join-requests/:id/approve')
  approveJoinRequest(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.tenants.approveJoinRequest(this.actor(user), id);
  }

  @Post('join-requests/:id/reject')
  rejectJoinRequest(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectJoinRequestDto,
  ) {
    return this.tenants.rejectJoinRequest(this.actor(user), id, dto);
  }

  @Post('leave')
  leave(@CurrentUser() user: JwtPayload) {
    return this.tenants.leave(this.actor(user));
  }

  @Get(':id')
  detail(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) { return this.tenants.detail(this.actor(user), id); }

  @Get(':id/join-requests')
  listJoinRequests(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.tenants.listJoinRequests(this.actor(user), id);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.tenants.removeMember(this.actor(user), id, userId);
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTenantDto) {
    return this.tenants.update(this.actor(user), id, dto);
  }

  @Post(':id/transfer')
  transfer(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: TransferTenantDto) {
    return this.tenants.transfer(this.actor(user), id, dto);
  }

  @Delete(':id')
  delete(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) { return this.tenants.delete(this.actor(user), id); }

  @Get(':id/audit')
  tenantAudit(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) { return this.tenants.audit(this.actor(user), id); }
}
