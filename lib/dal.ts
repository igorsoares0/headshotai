import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

/**
 * The current user's live record from the DB — read this (not the JWT session)
 * for the name/email so a profile edit reflects everywhere on the next render
 * without forcing a re-login. Redirects to /login if there's no session, or if
 * the account was deleted out from under a still-valid cookie. Memoized per
 * render pass.
 */
export const getUser = cache(async () => {
  const id = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, emailVerified: true, createdAt: true },
  });
  if (!user) redirect("/login");
  return user;
});
