import { Module, RequestMethod } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppConfigService } from '../config/app-config.service';

function prettyTransportIfAvailable():
  | { target: string; options: object }
  | undefined {
  try {
    require.resolve('pino-pretty');
  } catch {
    return undefined;
  }

  return {
    target: 'pino-pretty',
    options: {
      singleLine: true,
      translateTime: 'SYS:HH:MM:ss',
      ignore: 'pid,hostname',
    },
  };
}

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        exclude: [
          { method: RequestMethod.ALL, path: 'health/live' },
          { method: RequestMethod.ALL, path: 'health/ready' },
        ],
        pinoHttp: {
          level: config.logLevel,

          genReqId: (req: { id?: unknown }) => req.id as string,

          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.body.password',
              'req.body.currentPassword',
              'req.body.newPassword',
              'res.headers["set-cookie"]',
            ],
            censor: '[REDACTED]',
          },

          transport: config.isProduction
            ? undefined
            : prettyTransportIfAvailable(),
        },
      }),
    }),
  ],
})
export class LoggingModule {}
