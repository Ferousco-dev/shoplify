import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AppShell from "@/components/layout/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = await getSession();
  if (!s.shopDomain || !s.accessToken) {
    redirect("/");
  }
  return <AppShell>{children}</AppShell>;
}
