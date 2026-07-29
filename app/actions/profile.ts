"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/dal";
import { listOrders } from "@/lib/store";
import { r2DeletePrefix } from "@/lib/r2";
import { deleteModelVersion, splitVersion } from "@/lib/replicate";
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
 * verification tokens, every image object in R2, the trained likeness models at
 * Replicate, and the user row — then sign out. Destructive and irreversible;
 * the UI gates this behind a typed confirmation.
 *
 * Order matters: everything external goes BEFORE the database transaction. The
 * order rows are the only record of which Replicate version and which R2 prefix
 * belong to this user, so dropping them first would orphan whatever failed to
 * delete, with nothing left to retry from.
 */
export async function deleteAccount(): Promise<void> {
  const userId = await requireUserId();

  // Best-effort: remove each order's objects from every R2 prefix.
  const orders = await listOrders(userId);
  await Promise.all(
    orders.flatMap((o) =>
      ["uploads", "datasets", "generated", "upscaled"].map((p) =>
        r2DeletePrefix(`${p}/${o.id}/`).catch(() => {}),
      ),
    ),
  );

  // The likeness models themselves — the third copy of this person's face,
  // after the database rows and the image files. Deleting the version also
  // removes the predictions and outputs Replicate holds for it.
  await Promise.all(
    orders.map(async (o) => {
      const v = splitVersion(o.trainedVersion, o.destination);
      if (!v) return; // training never produced a version — nothing to delete
      const ok = await deleteModelVersion(v.model, v.versionId).catch(() => false);
      if (!ok) {
        // Loud, and with the ids: after the transaction below these are the only
        // surviving trace of a model that should no longer exist.
        console.error(
          `[account deletion] ORPHANED likeness model ${v.model}:${v.versionId} (order ${o.id}, user ${userId}) — delete it manually`,
        );
      }
    }),
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
