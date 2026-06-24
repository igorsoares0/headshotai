import Link from "next/link";
import { ResetForm } from "./reset-form";

export const dynamic = "force-dynamic";

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-5 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-paper">
            <span className="block h-2.5 w-2.5 rounded-full border-2 border-electric" />
          </span>
          <span className="text-lg font-extrabold tracking-tight">aperture</span>
        </Link>

        <div className="rounded-card border border-line bg-paper-raised p-7">
          <p className="kicker text-muted">Choose a new password</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Set new password</h1>
          {token ? (
            <ResetForm token={token} />
          ) : (
            <p className="mt-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
              Missing reset token. Request a new link from the{" "}
              <Link href="/forgot" className="font-semibold underline">
                forgot password
              </Link>{" "}
              page.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
