import BottomTabBar from "@/app/components/BottomTabBar";
import Sidebar from "@/app/components/Sidebar";

export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Sidebar />
      <main className="flex-1 pb-20 md:pb-0 md:pl-56">{children}</main>
      <BottomTabBar />
    </div>
  );
}
