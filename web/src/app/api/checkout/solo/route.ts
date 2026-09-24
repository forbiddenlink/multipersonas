import { startPlanCheckout } from "@/lib/checkout";

export const runtime = "nodejs";

export async function POST(): Promise<Response> {
  return startPlanCheckout("solo");
}
