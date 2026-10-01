import type { Metadata } from "next";
import type { ReactNode } from "react";

// The page itself is a client component, so its title lives in this server layout.
export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
