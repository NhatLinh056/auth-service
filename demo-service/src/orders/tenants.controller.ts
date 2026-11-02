import { Body, Controller, Delete, Get, Headers, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthClientService } from '../auth-client/auth-client.service.js';
import { UserAuthGuard } from '../auth-client/guards/user-auth.guard.js';

@Controller('tenant')
@UseGuards(UserAuthGuard)
export class TenantsController {
  constructor(private readonly auth: AuthClientService) {}

  @Get('me')
  me(@Headers('authorization') token: string) { return this.auth.tenantRequest('GET', '/me', token); }

  @Get()
  list(@Headers('authorization') token: string) { return this.auth.tenantRequest('GET', '', token); }

  @Post()
  create(@Headers('authorization') token: string, @Body() body: unknown) { return this.auth.tenantRequest('POST', '', token, body); }

  @Get(':id')
  detail(@Headers('authorization') token: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.auth.tenantRequest('GET', `/${id}`, token);
  }

  @Patch(':id')
  update(@Headers('authorization') token: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown) {
    return this.auth.tenantRequest('PATCH', `/${id}`, token, body);
  }

  @Post(':id/transfer')
  transfer(@Headers('authorization') token: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown) {
    return this.auth.tenantRequest('POST', `/${id}/transfer`, token, body);
  }

  @Delete(':id')
  delete(@Headers('authorization') token: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.auth.tenantRequest('DELETE', `/${id}`, token);
  }

  @Get(':id/audit')
  audit(@Headers('authorization') token: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.auth.tenantRequest('GET', `/${id}/audit`, token);
  }
}
