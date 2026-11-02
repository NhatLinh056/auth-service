import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, ValidateIf, IsString } from 'class-validator';

export class UpdateOAuthProviderDto {
  @ApiPropertyOptional({
    description: 'Bật hoặc tắt phương thức đăng nhập OAuth này',
    example: true,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Client ID hoặc App ID từ nhà cung cấp OAuth (Google / Meta)',
    example: '123456789-abcdef.apps.googleusercontent.com',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Client Secret hoặc App Secret từ nhà cung cấp (Bảo mật, không trả về client)',
    example: 'GOCSPX-SecretKeySample123',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  clientSecret?: string;

}
