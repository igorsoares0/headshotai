import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Authorization gate for the dashboard. Returns the current user's id or
 * redirects to /login. Memoized per render pass so multiple callers in one
 * request share a single session check.
 */
export const requireUserId = cache(async (): Promise<string> => {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
});
