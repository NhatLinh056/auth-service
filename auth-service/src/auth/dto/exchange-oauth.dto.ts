import { IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class ExchangeOAuthDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  code: string;

  @IsString()
  @Matches(/^[A-Za-z0-9._~-]{43,128}$/)
  verifier: string;
}

export class ConfirmOAuthDto extends ExchangeOAuthDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(8192)
  linkToken?: string;
}
