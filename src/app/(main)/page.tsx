import type { Metadata } from "next";
import HomeScreen from "@/app/components/home/HomeScreen";

export const metadata: Metadata = {
  title: "Home",
  description: "Tổng quan số dư, thu chi và các khoản vay/cho mượn.",
};

export default function HomePage() {
  return <HomeScreen />;
}
