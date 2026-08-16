import type { Metadata } from "next";
import Link from "next/link";
import AuthCard from "@/app/components/AuthCard";
import LoginForm from "@/app/components/LoginForm";

export const metadata: Metadata = {
  title: "Đăng nhập",
};

export default function LoginPage() {
  return (
    <>
      <AuthCard title="Đăng nhập" subtitle="Chào mừng bạn trở lại!">
        <LoginForm />
      </AuthCard>
      <p className="mt-6 text-center text-sm text-slate-500">
        Chưa có tài khoản?{" "}
        <Link
          href="/register"
          className="font-medium text-emerald-600 hover:text-emerald-700"
        >
          Đăng ký
        </Link>
      </p>
    </>
  );
}
