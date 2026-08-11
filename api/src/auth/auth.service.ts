import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UnauthenticatedError } from '../common/errors/domain.error';
import { PasswordHasher } from '../crypto/password-hasher.service';
import { UserDto, toUserDto } from '../users/dto/user.dto';
import type { UserIdentity } from '../users/users.repository';
import { UsersService } from '../users/users.service';
import { AuthErrorCode, invalidCredentials } from './auth-errors';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const TOKEN_TYPE = 'Bearer';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly hasher: PasswordHasher,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const user = await this.users.create(dto);
    return this.issueSession(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const found = await this.users.findWithCredentials(dto.email);

    if (!found) {
      await this.hasher.simulateVerify();
      throw invalidCredentials();
    }

    const passwordMatches = await this.hasher.verify(
      found.passwordHash,
      dto.password,
    );

    if (!passwordMatches) {
      throw invalidCredentials();
    }

    return this.issueSession(found.user);
  }

  async me(userId: string): Promise<UserDto> {
    const user = await this.users.findById(userId);

    if (!user) {
      throw new UnauthenticatedError(
        AuthErrorCode.INVALID_TOKEN,
        'Sessao invalida. Faca login novamente.',
      );
    }

    return toUserDto(user);
  }

  private async issueSession(user: UserIdentity): Promise<AuthResponseDto> {
    const accessToken = await this.jwt.signAsync({ sub: user.id });

    return {
      accessToken,
      tokenType: TOKEN_TYPE,
      expiresIn: this.tokenLifetimeInSeconds(accessToken),
      user: toUserDto(user),
    };
  }

  private tokenLifetimeInSeconds(accessToken: string): number {
    const payload = this.jwt.decode<{ iat?: number; exp?: number } | null>(
      accessToken,
    );

    return payload?.exp && payload.iat ? payload.exp - payload.iat : 0;
  }
}
