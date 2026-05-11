import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardHome from "@/components/DashboardHome";

export default async function DashboardPage() {
  const s = await getSession();
  if (!s.shopDomain || !s.accessToken) {
    redirect("/");
  }
  return <DashboardHome shopName={s.shopName || s.shopDomain || ""} shopDomain={s.shopDomain!} />;
}
