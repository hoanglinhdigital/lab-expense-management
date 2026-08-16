"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, User } from "lucide-react";
import AuthSubmitButton from "./AuthSubmitButton";
import AuthTextField from "./AuthTextField";
import FormAlert from "./FormAlert";
import {
  hasErrors,
  register,
  validateRegister,
  type FieldErrors,
  type RegisterInput,
} from "@/lib/auth-client";

export default function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [errors, setErrors] = useState<FieldErrors<RegisterInput>>({});
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function clearError(field: keyof RegisterInput) {
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  async function submit() {
    const input: RegisterInput = {
      email: email.trim(),
      password,
      confirmPassword,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    };
    const nextErrors = validateRegister(input);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    setFormError(null);
    setPending(true);
    const result = await register(input);
    setPending(false);

    if (result.ok) {
      router.push("/login");
      return;
    }
    setFormError(result.message);
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="flex flex-col gap-4"
    >
      {formError ? (
        <FormAlert
          tone="error"
          message={formError}
          onRetry={() => void submit()}
        />
      ) : null}

      <AuthTextField
        id="register-email"
        name="email"
        label="Email"
        placeholder="Nhập email của bạn"
        icon={Mail}
        type="email"
        autoComplete="email"
        value={email}
        onChange={(value) => {
          setEmail(value);
          clearError("email");
        }}
        error={errors.email}
        disabled={pending}
      />

      <AuthTextField
        id="register-password"
        name="password"
        label="Mật khẩu"
        placeholder="Nhập mật khẩu"
        icon={Lock}
        type="password"
        autoComplete="new-password"
        revealable
        value={password}
        onChange={(value) => {
          setPassword(value);
          clearError("password");
        }}
        error={errors.password}
        disabled={pending}
      />

      <AuthTextField
        id="register-confirm-password"
        name="confirmPassword"
        label="Xác nhận mật khẩu"
        placeholder="Xác nhận mật khẩu"
        icon={Lock}
        type="password"
        autoComplete="new-password"
        revealable
        value={confirmPassword}
        onChange={(value) => {
          setConfirmPassword(value);
          clearError("confirmPassword");
        }}
        error={errors.confirmPassword}
        disabled={pending}
      />

      <AuthTextField
        id="register-first-name"
        name="firstName"
        label="Tên"
        placeholder="Tên (không bắt buộc)"
        icon={User}
        autoComplete="given-name"
        value={firstName}
        onChange={setFirstName}
        disabled={pending}
      />

      <AuthTextField
        id="register-last-name"
        name="lastName"
        label="Họ"
        placeholder="Họ (không bắt buộc)"
        icon={User}
        autoComplete="family-name"
        value={lastName}
        onChange={setLastName}
        disabled={pending}
      />

      <div className="mt-2">
        <AuthSubmitButton label="Đăng ký" pending={pending} />
      </div>
    </form>
  );
}
