"use client";

import { useEffect } from "react";
import { identifyUser } from "@/lib/analytics";

/**
 * Mounted in the signed-in app layout. Identifies the PostHog person by Supabase user id
 * (no email, no name) so an anonymous grade, the signup, and a later upgrade become one
 * person. Plan rides along as a person property. Renders nothing.
 */
export function PostHogIdentify({ userId, plan }: { userId: string; plan?: string }) {
  useEffect(() => {
    identifyUser(userId, { plan });
  }, [userId, plan]);

  return null;
}
