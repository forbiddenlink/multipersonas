import { AppNav } from "@/components/app-nav";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AppNav userEmail={user?.email ?? null} />
      <main className="flex-1 p-6 md:p-8">{children}</main>
    </div>
  );
}
