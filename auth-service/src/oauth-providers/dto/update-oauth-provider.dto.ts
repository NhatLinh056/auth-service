import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateOAuthProviderDto {
  @ApiPropertyOptional({
    description: 'Bật hoặc tắt phương thức đăng nhập OAuth này',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Client ID hoặc App ID từ nhà cung cấp OAuth (Google / Meta)',
    example: '123456789-abcdef.apps.googleusercontent.com',
  })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Client Secret hoặc App Secret từ nhà cung cấp (Bảo mật, không trả về client)',
    example: 'GOCSPX-SecretKeySample123',
  })
  @IsOptional()
  @IsString()
  clientSecret?: string;

  @ApiPropertyOptional({
    description: 'Callback URL redirect về sau khi đăng nhập thành công',
    example: 'http://localhost:3000/auth/oauth/google/callback',
  })
  @IsOptional()
  @IsString()
  callbackUrl?: string;
}
