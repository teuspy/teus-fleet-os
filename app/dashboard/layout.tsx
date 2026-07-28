import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="grid grid-cols-[240px_1fr] min-h-screen">
      <Sidebar userEmail={user.email || ""} />
      <main className="overflow-x-hidden">{children}</main>
    </div>
  );
}
