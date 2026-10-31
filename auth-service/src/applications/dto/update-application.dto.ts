import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
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

  @ApiPropertyOptional({
    example: ['admin@company.com'],
    description: 'Danh sách email được cấp quyền Quản trị viên (ADMIN) riêng cho ứng dụng này',
  })
  @IsOptional()
  @IsArray({ message: 'adminEmails phải là mảng các địa chỉ email' })
  @IsString({ each: true, message: 'Mỗi email trong adminEmails phải là chuỗi' })
  adminEmails?: string[];
}
