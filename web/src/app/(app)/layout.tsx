import { AppNav } from "@/components/app-nav";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AppNav />
      <main className="flex-1 p-6 md:p-8">{children}</main>
    </div>
  );
}
