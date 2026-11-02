import { IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class SetPasswordDto {
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword?: string;
}
