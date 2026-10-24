import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'Nguyen Van B',
    description: 'Họ và tên của người dùng',
  })
  @IsOptional()
  @IsString({ message: 'Tên phải là chuỗi' })
  name?: string;

  @ApiPropertyOptional({
    example: 'newpassword123',
    description: 'Mật khẩu mới (ít nhất 6 ký tự)',
  })
  @IsOptional()
  @IsString({ message: 'Mật khẩu phải là chuỗi' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password?: string;
}
