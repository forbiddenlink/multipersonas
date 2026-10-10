import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Link no longer active",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

// One plain page for every failure: the link was revoked, has expired, or never existed.
export default function SharedReportNotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-14">
      <h1 className="text-xl font-semibold">This link is no longer active</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        The report link has expired, was turned off by its owner, or is not valid. Ask the person who
        sent it for a new link.
      </p>
    </main>
  );
}
