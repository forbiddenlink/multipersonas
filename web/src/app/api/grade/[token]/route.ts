import { NextResponse } from "next/server";
import { getGraderScan } from "@/lib/grade";

// Poll a grade by token. The client form calls this until status is completed/failed.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const scan = await getGraderScan(token);
  if (!scan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    status: scan.status,
    report: scan.report,
    entryUrl: scan.entry_url,
    pagesVisited: scan.pages_visited,
    error: scan.error,
  });
}
