import type { Metadata } from "next";
import RecordScreen from "@/app/components/record/RecordScreen";

export const metadata: Metadata = {
  title: "Ghi giao dịch",
  description: "Nhập nhanh khoản chi, khoản thu, chuyển khoản, vay và cho mượn.",
};

export default function RecordPage() {
  return <RecordScreen />;
}
