import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConflictError } from './common/errors/domain.error';
import { UserErrorCode } from './users/user-errors';
import { UsersService } from './users/users.service';

const DEMO_USER = {
  name: 'User1',
  email: 'user1@email.dev',
  password: 'user1-123@',
};

async function seed(): Promise<void> {
  const { email, password } = DEMO_USER;
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    await app.get(UsersService).create(DEMO_USER);
    console.log(`[seed] usuario de demo criado: ${email} / ${password}`);
  } catch (error) {
    if (
      error instanceof ConflictError &&
      error.code === UserErrorCode.EMAIL_ALREADY_REGISTERED
    ) {
      console.log(`[seed] usuario de demo ja existe: ${email}`);
    } else {
      throw error;
    }
  } finally {
    await app.close();
  }
}

void seed().catch((error: unknown) => {
  console.error('[seed] falhou:', error);
  process.exit(1);
});
