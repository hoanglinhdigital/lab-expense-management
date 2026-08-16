/** Nghiệp vụ đăng ký / đăng nhập / hồ sơ (`docs/api-spec/auth.yaml`). */

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ApiError, conflict, notFound } from "@/lib/api/errors";
import { createSession, destroySession } from "@/lib/api/session";
import {
  toUserDto,
  userSelect,
  type UserDto,
} from "@/lib/api/serializers/user.serializer";
import { assertCurrencySupported } from "./currency.service";
import type {
  LoginInput,
  RegisterInput,
  UpdateUserInput,
} from "@/lib/api/schemas/auth.schema";

const BCRYPT_ROUNDS = 10;
const DEFAULT_CURRENCY = "VND";

function emailAlreadyExists(): ApiError {
  return conflict("EMAIL_ALREADY_EXISTS", "Email này đã được đăng ký.");
}

function invalidCredentials(): ApiError {
  return new ApiError(
    401,
    "INVALID_CREDENTIALS",
    "Email hoặc mật khẩu không đúng.",
  );
}

export async function registerUser(input: RegisterInput): Promise<UserDto> {
  const currency = input.defaultCurrency ?? DEFAULT_CURRENCY;
  await assertCurrencySupported(currency, "defaultCurrency");

  // Email của tài khoản đã xoá mềm vẫn giữ chỗ ở unique index, nên vẫn coi là trùng.
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) throw emailAlreadyExists();

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        defaultCurrency: currency,
      },
      select: userSelect,
    });
  } catch (error) {
    // Hai request register cùng email chạy song song — unique index chặn ở DB.
    if (isUniqueViolation(error)) throw emailAlreadyExists();
    throw error;
  }

  await createSession(user.id);
  return toUserDto(user);
}

export async function loginUser(input: LoginInput): Promise<UserDto> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...userSelect, passwordHash: true, isDeleted: true },
  });

  // Sai email và sai mật khẩu trả cùng một lỗi để không dò được email nào tồn tại.
  if (!user || user.isDeleted) throw invalidCredentials();

  const matched = await bcrypt.compare(input.password, user.passwordHash);
  if (!matched) throw invalidCredentials();

  await createSession(user.id);
  return toUserDto(user);
}

export async function logoutUser(): Promise<void> {
  await destroySession();
}

export async function getCurrentUser(userId: string): Promise<UserDto> {
  const user = await prisma.user.findFirst({
    where: { id: userId, isDeleted: false },
    select: userSelect,
  });

  if (!user) throw notFound("USER_NOT_FOUND", "Không tìm thấy người dùng.");
  return toUserDto(user);
}

export async function updateCurrentUser(
  userId: string,
  input: UpdateUserInput,
): Promise<UserDto> {
  if (input.defaultCurrency) {
    await assertCurrencySupported(input.defaultCurrency, "defaultCurrency");
  }

  const existing = await prisma.user.findFirst({
    where: { id: userId, isDeleted: false },
    select: { id: true },
  });
  if (!existing) throw notFound("USER_NOT_FOUND", "Không tìm thấy người dùng.");

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.defaultCurrency !== undefined
        ? { defaultCurrency: input.defaultCurrency }
        : {}),
    },
    select: userSelect,
  });

  return toUserDto(user);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
