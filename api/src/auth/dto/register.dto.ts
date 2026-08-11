import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { trimmed } from '../../common/transforms';

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

export class RegisterDto {
  @ApiProperty({ example: 'First User', maxLength: 120 })
  @IsString()
  @Transform(trimmed)
  @IsNotEmpty({ message: 'name cannot be empty.' })
  @Length(1, 120, { message: 'name must be at most 120 characters long.' })
  name!: string;

  @ApiProperty({
    example: 'user@example.com',
    format: 'email',
    maxLength: 255,
  })
  @IsString()
  @Transform(trimmed)
  @Length(1, 255, {
    message: 'email must be at most 255 characters long.',
  })
  @IsEmail({}, { message: 'email must be a valid email address.' })
  email!: string;

  @ApiProperty({
    example: 'a-good-and-long-password',
    minLength: PASSWORD_MIN,
    maxLength: PASSWORD_MAX,
    description:
      'Minimum of 8 characters. There is NO composition requirement (uppercase, digit, symbol) — composition rules encourage predictable patterns such as "Password@123". Instead, common, sequential, repetitive, or passwords derived from the user’s name or email are rejected, in accordance with NIST SP 800-63B.',
  })
  @IsString()
  @Length(PASSWORD_MIN, PASSWORD_MAX, {
    message: `password must be between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters long.`,
  })

  password!: string;
}