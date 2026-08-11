import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { HealthService } from './health.service';

@Public()
@SkipThrottle()
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe — o processo esta no ar' })
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe — dependencias respondem' })
  @ApiOkResponse({ schema: { example: { status: 'ok', database: 'up' } } })
  async ready(): Promise<{ status: string; database: string }> {
    if (!(await this.health.isDatabaseReachable())) {
      throw new ServiceUnavailableException({
        code: 'DATABASE_UNAVAILABLE',
        message: 'Banco de dados indisponivel.',
      });
    }

    return { status: 'ok', database: 'up' };
  }
}
