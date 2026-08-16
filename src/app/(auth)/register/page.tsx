import type { Metadata } from "next";
import Link from "next/link";
import AuthCard from "@/app/components/AuthCard";
import RegisterForm from "@/app/components/RegisterForm";

export const metadata: Metadata = {
  title: "Tạo tài khoản",
};

export default function RegisterPage() {
  return (
    <>
      <AuthCard title="Tạo tài khoản" subtitle="Điền thông tin để bắt đầu">
        <RegisterForm />
      </AuthCard>
      <p className="mt-6 text-center text-sm text-slate-500">
        Đã có tài khoản?{" "}
        <Link
          href="/login"
          className="font-medium text-emerald-600 hover:text-emerald-700"
        >
          Đăng nhập
        </Link>
      </p>
    </>
  );
}
