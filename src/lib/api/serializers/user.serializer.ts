/** Map record Prisma → schema `User` của `auth.yaml`. Không bao giờ chứa `passwordHash`. */

export interface UserDto {
  id: string;
  email: string;
  name: string;
  defaultCurrency: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  defaultCurrency: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Chọn field tường minh cho truy vấn Prisma — không select `passwordHash`. */
export const userSelect = {
  id: true,
  email: true,
  name: true,
  defaultCurrency: true,
  createdAt: true,
  updatedAt: true,
} as const;

export function toUserDto(user: UserRecord): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    defaultCurrency: user.defaultCurrency,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
