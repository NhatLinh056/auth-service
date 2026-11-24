import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'Nguyen Van B',
    description: 'Họ và tên của người dùng',
  })
  @IsOptional()
  @IsString({ message: 'Tên phải là chuỗi' })
  name?: string;
}
