import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from '../../users/dto/user.dto';

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description:
      'Signed JWT (HS256). In the frontend BFF, this value is stored in an httpOnly cookie by the Next.js server and never reaches browser JavaScript.',
  })
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: string;

  @ApiProperty({
    example: 3600,
    description:
      'Token lifetime in seconds. This allows the BFF to set the cookie Max-Age without decoding the token or knowing the API configuration.',
  })
  expiresIn!: number;

  @ApiProperty({ type: UserDto })
  user!: UserDto;
}