import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { trimmed } from '../../common/transforms';

export class LoginDto {
  @ApiProperty({ example: 'user@exemple.com', format: 'email' })
  @IsString()
  @Transform(trimmed)
  @MaxLength(255)
  @IsEmail({}, { message: 'email must be a valid email address' })
  email!: string;

  @ApiProperty({ example: 'long-strong-pass@6', maxLength: 128 })
  @IsString()
  @IsNotEmpty({ message: 'password must be defined' })
  @MaxLength(128)
  password!: string;
}
