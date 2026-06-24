import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { consumeToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const userId = token ? await consumeToken(token, "verify_email") : null;

  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    });
  }

  const ok = Boolean(userId);

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-5 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="rounded-card border border-line bg-paper-raised p-7">
          <h1 className="text-2xl font-extrabold tracking-tight">
            {ok ? "Email verified" : "Link invalid or expired"}
          </h1>
          <p className="mt-3 text-sm text-muted">
            {ok
              ? "Your email is confirmed — you can now generate headshots."
              : "This verification link is no longer valid. Sign in and request a new one."}
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block rounded-full bg-electric px-5 py-3 text-sm font-semibold text-white transition active:scale-[0.97] hover:bg-electric-dim"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
