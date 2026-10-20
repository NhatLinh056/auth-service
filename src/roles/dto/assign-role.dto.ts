import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { Role } from '../../generated/prisma/enums.js';

export class AssignRoleDto {
  @ApiProperty({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'UUID của người dùng cần gán vai trò',
  })
  @IsNotEmpty({ message: 'userId không được để trống' })
  @IsUUID('all', { message: 'userId phải là định dạng UUID hợp lệ' })
  userId: string;

  @ApiProperty({
    enum: Role,
    example: Role.ADMIN,
    description: 'Vai trò cần gán cho người dùng (ADMIN hoặc USER)',
  })
  @IsNotEmpty({ message: 'role không được để trống' })
  @IsEnum(Role, { message: 'role phải là một trong các giá trị: ADMIN, USER' })
  role: Role;
}
