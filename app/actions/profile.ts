"use server";

import { rm } from "node:fs/promises";
import { join } from "node:path";
import * as z from "zod";
import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/dal";
import { listOrders } from "@/lib/store";
import type { FormState } from "@/lib/definitions";

const NameSchema = z.object({
  name: z.string().trim().min(1, "Name can't be empty").max(80, "Name is too long"),
});

/** Update the signed-in user's display name. */
export async function updateName(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = NameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const userId = await requireUserId();
  await prisma.user.update({ where: { id: userId }, data: { name: parsed.data.name } });

  // Refresh the whole dashboard subtree so the sidebar + greeting (which read the
  // name from the DB, not the JWT) pick up the change on the next render.
  revalidatePath("/dashboard", "layout");
  return { message: "ok" };
}

/**
 * Permanently delete the signed-in user's account: their orders, purchases,
 * verification tokens, the generated image files on disk, and the user row —
 * then sign out. Destructive and irreversible; the UI gates this behind a typed
 * confirmation.
 */
export async function deleteAccount(): Promise<void> {
  const userId = await requireUserId();

  // Best-effort: remove each order's generated images from public/generated/<id>.
  const orders = await listOrders(userId);
  await Promise.all(
    orders.map((o) =>
      rm(join(process.cwd(), "public", "generated", o.id), { recursive: true, force: true }).catch(
        () => {},
      ),
    ),
  );

  await prisma.$transaction([
    prisma.order.deleteMany({ where: { userId } }),
    prisma.purchase.deleteMany({ where: { userId } }),
    prisma.verificationToken.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  // Clears the session cookie and redirects to /login.
  await signOut({ redirectTo: "/login" });
}
