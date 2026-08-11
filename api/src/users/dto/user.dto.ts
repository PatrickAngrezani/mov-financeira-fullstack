import { ApiProperty } from '@nestjs/swagger';
import type { UserIdentity } from '../users.repository';

export class UserDto {
  @ApiProperty({
    example: '0195e2a1-7f3c-7c2e-9b4d-3f1a2b3c4d5e',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ example: 'First User' })
  name!: string;

  @ApiProperty({ example: 'user@email.com', format: 'email' })
  email!: string;

  @ApiProperty({ example: '2026-08-08T14:22:31.000Z', format: 'date-time' })
  createdAt!: string;
}

export function toUserDto(user: UserIdentity): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}
