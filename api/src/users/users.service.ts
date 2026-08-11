import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '../crypto/password-hasher.service';
import type { UserIdentity, UserWithCredentials } from './users.repository';
import { UsersRepository } from './users.repository';

export interface CreateUserCommand {
  name: string;
  email: string;
  password: string;
}

const DEFAULT_CATEGORIES = [
  { name: 'Salário', color: '#10B981' },
  { name: 'Alimentação', color: '#EF4444' },
  { name: 'Moradia', color: '#F97316' },
  { name: 'Transporte', color: '#EAB308' },
  { name: 'Saúde', color: '#22C55E' },
  { name: 'Educação', color: '#3B82F6' },
  { name: 'Lazer', color: '#A855F7' },
  { name: 'Outros', color: '#6B7280' },
] as const;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class UsersService {
  constructor(
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async create(command: CreateUserCommand): Promise<UserIdentity> {
    const passwordHash = await this.hasher.hash(command.password);

    return this.users.create({
      email: normalizeEmail(command.email),
      name: command.name.trim(),
      passwordHash,
      categories: DEFAULT_CATEGORIES,
    });
  }

  async delete(id: string): Promise<void> {
    await this.users.delete(id);
  }

  async findById(id: string): Promise<UserIdentity | null> {
    return await this.users.findById(id);
  }

  async findWithCredentials(
    email: string,
  ): Promise<UserWithCredentials | null> {
    return await this.users.findWithCredentialsByEmail(normalizeEmail(email));
  }
}
