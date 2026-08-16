"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail } from "lucide-react";
import AuthSubmitButton from "./AuthSubmitButton";
import AuthTextField from "./AuthTextField";
import FormAlert from "./FormAlert";
import SocialLoginRow from "./SocialLoginRow";
import {
  hasErrors,
  login,
  validateLogin,
  type FieldErrors,
  type LoginInput,
} from "@/lib/auth-client";

const COMING_SOON = "Tính năng đang phát triển, vui lòng quay lại sau.";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors<LoginInput>>({});
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    const input: LoginInput = { email: email.trim(), password };
    const nextErrors = validateLogin(input);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    setFormError(null);
    setNotice(null);
    setPending(true);
    const result = await login(input);
    setPending(false);

    if (result.ok) {
      router.push("/");
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
      {notice ? <FormAlert tone="info" message={notice} /> : null}

      <AuthTextField
        id="login-email"
        name="email"
        label="Email"
        placeholder="Nhập email của bạn"
        icon={Mail}
        type="email"
        autoComplete="email"
        value={email}
        onChange={(value) => {
          setEmail(value);
          setErrors((previous) => ({ ...previous, email: undefined }));
        }}
        error={errors.email}
        disabled={pending}
      />

      <AuthTextField
        id="login-password"
        name="password"
        label="Mật khẩu"
        placeholder="Nhập mật khẩu"
        icon={Lock}
        type="password"
        autoComplete="current-password"
        revealable
        value={password}
        onChange={(value) => {
          setPassword(value);
          setErrors((previous) => ({ ...previous, password: undefined }));
        }}
        error={errors.password}
        disabled={pending}
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setNotice(COMING_SOON)}
          className="flex min-h-11 items-center px-1 text-sm font-medium text-emerald-600"
        >
          Quên mật khẩu?
        </button>
      </div>

      <SocialLoginRow onSelect={() => setNotice(COMING_SOON)} disabled={pending} />

      <div className="mt-2">
        <AuthSubmitButton label="Đăng nhập" pending={pending} />
      </div>
    </form>
  );
}
