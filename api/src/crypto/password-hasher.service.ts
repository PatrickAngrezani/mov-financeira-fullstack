import { Injectable, OnModuleInit } from '@nestjs/common';
import * as argon2 from 'argon2';

const ARGON2_OPTIONS: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

const DUMMY_PASSWORD = 'senha-descartavel-do-simulate-verify';
const DUMMY_MISMATCH = 'valor-que-nunca-confere';

@Injectable()
export class PasswordHasher implements OnModuleInit {
  private dummyHash?: string;

  async onModuleInit(): Promise<void> {
    this.dummyHash = await argon2.hash(DUMMY_PASSWORD, ARGON2_OPTIONS);
  }

  hash(plainPassword: string): Promise<string> {
    return argon2.hash(plainPassword, ARGON2_OPTIONS);
  }

  async verify(hash: string, plainPassword: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plainPassword);
    } catch {
      return false;
    }
  }

  async simulateVerify(): Promise<void> {
    const dummyHash = (this.dummyHash ??= await argon2.hash(
      DUMMY_PASSWORD,
      ARGON2_OPTIONS,
    ));

    await argon2.verify(dummyHash, DUMMY_MISMATCH);
  }
}
