import { Module } from '@nestjs/common';
import { CryptoModule } from '../crypto/crypto.module';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [CryptoModule],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
