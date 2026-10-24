import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({
    example: 'Payment Service',
    description: 'Tên định danh của ứng dụng / microservice',
  })
  @IsString({ message: 'Tên ứng dụng phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên ứng dụng không được để trống' })
  name: string;

  @ApiPropertyOptional({
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
    description: 'UUID của người dùng sở hữu ứng dụng (Chỉ ADMIN được gán cho người dùng khác)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'userId phải có định dạng UUID v4 hợp lệ' })
  userId?: string;
}
