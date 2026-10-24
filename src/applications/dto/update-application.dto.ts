import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AppStatus } from '../../generated/prisma/enums.js';

export class UpdateApplicationDto {
  @ApiPropertyOptional({
    example: 'Payment Gateway V2',
    description: 'Tên định danh mới của ứng dụng',
  })
  @IsOptional()
  @IsString({ message: 'Tên ứng dụng phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên ứng dụng không được để chuỗi rỗng' })
  name?: string;

  @ApiPropertyOptional({
    example: AppStatus.INACTIVE,
    enum: AppStatus,
    description: 'Trạng thái hoạt động của ứng dụng (ACTIVE hoặc INACTIVE)',
  })
  @IsOptional()
  @IsEnum(AppStatus, { message: 'Trạng thái ứng dụng phải là ACTIVE hoặc INACTIVE' })
  status?: AppStatus;
}
