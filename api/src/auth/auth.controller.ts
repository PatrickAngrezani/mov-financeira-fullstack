import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  ApiAuthenticated,
  ApiErrors,
} from '../common/decorators/api-errors.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserDto } from '../users/dto/user.dto';
import { AuthService } from './auth.service';
import { CurrentUser, type AuthenticatedUser } from './current-user.decorator';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  // @Throttle(REGISTER_RATE_LIMIT)
  @Post('register')
  @ApiOperation({
    summary: 'Create account with default categories',
    description:
      'Auto-login. Default categories are created with user. No user has no categories',
  })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiErrors({
    [HttpStatus.CONFLICT]: 'EMAIL_ALREADY_REGISTERED',
    [HttpStatus.BAD_REQUEST]: 'VALIDATION_FAILED',
    [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
  })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.auth.register(dto);
  }

  @Public()
  // @Throttle(LOGIN_RATE_LIMIT)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check token and return',
    description:
      'E-mail does not exists or invalid password give the same answer. It doesnt reveal existing accounts',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiErrors({
    [HttpStatus.UNAUTHORIZED]: 'INVALID_CREDENTIALS',
    [HttpStatus.BAD_REQUEST]: 'VALIDATION_FAILED',
    [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
  })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.auth.login(dto);
  }

  @Get('me')
  @ApiAuthenticated()
  @ApiOperation({
    summary: 'Token owner profile',
    description: 'Read from database. It loads id field',
  })
  @ApiOkResponse({ type: UserDto })
  me(@CurrentUser() user: AuthenticatedUser): Promise<UserDto> {
    return this.auth.me(user.id);
  }
}
