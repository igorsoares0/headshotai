"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "@/app/actions/auth";

export default function ForgotPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);

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
          <p className="kicker text-muted">Forgot password</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Reset your password</h1>

          {state?.message ? (
            <p className="mt-6 rounded-xl border border-line bg-paper px-4 py-3 text-sm text-muted">
              {state.message}
            </p>
          ) : (
            <form action={action} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="kicker text-muted">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-1.5 w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm outline-none transition-colors focus:border-electric"
                  placeholder="you@example.com"
                />
                {state?.errors?.email ? (
                  <p className="mt-1 text-xs text-danger">{state.errors.email[0]}</p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-full bg-electric px-5 py-3.5 text-sm font-semibold text-white transition active:scale-[0.97] hover:bg-electric-dim disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pending ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-electric hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
