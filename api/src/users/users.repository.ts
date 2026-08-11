import { Injectable } from '@nestjs/common';
import { ConflictError } from '../common/errors/domain.error';
import { isUniqueViolation } from '../prisma/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { UserErrorCode } from './user-errors';

export interface UserIdentity {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface UserWithCredentials {
  user: UserIdentity;
  passwordHash: string;
}

export interface CreateUserData {
  email: string;
  name: string;
  passwordHash: string;
  categories: readonly { name: string; color: string }[];
}

const IDENTITY_SELECT = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserData): Promise<UserIdentity> {
    try {
      return await this.prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash: data.passwordHash,
          categories: { create: data.categories.map((c) => ({ ...c })) },
        },
        select: IDENTITY_SELECT,
      });
    } catch (error) {
      if (isUniqueViolation(error, 'email')) {
        throw new ConflictError(
          UserErrorCode.EMAIL_ALREADY_REGISTERED,
          'Este e-mail ja esta cadastrado.',
          [{ field: 'email', message: 'Este e-mail ja esta cadastrado.' }],
        );
      }

      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: {
        id,
      },
    });
  }

  async findById(id: string): Promise<UserIdentity | null> {
    return await this.prisma.user.findUnique({
      where: { id },
      select: IDENTITY_SELECT,
    });
  }

  async findWithCredentialsByEmail(
    email: string,
  ): Promise<UserWithCredentials | null> {
    const row = await this.prisma.user.findUnique({
      where: { email },
      select: { ...IDENTITY_SELECT, passwordHash: true },
    });

    if (!row) {
      return null;
    }

    const { passwordHash, ...user } = row;

    return { user, passwordHash };
  }
}
