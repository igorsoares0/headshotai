"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "@/app/actions/auth";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined);

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
          <p className="kicker text-muted">Get started</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Create account</h1>

          <form action={action} className="mt-6 space-y-4">
            <div>
              <label htmlFor="name" className="kicker text-muted">Name</label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="mt-1.5 w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm outline-none transition-colors focus:border-electric"
                placeholder="Ada Lovelace"
              />
              {state?.errors?.name ? (
                <p className="mt-1 text-xs text-red-600">{state.errors.name[0]}</p>
              ) : null}
            </div>
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
                <p className="mt-1 text-xs text-red-600">{state.errors.email[0]}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="password" className="kicker text-muted">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1.5 w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm outline-none transition-colors focus:border-electric"
                placeholder="At least 8 characters"
              />
              {state?.errors?.password ? (
                <p className="mt-1 text-xs text-red-600">{state.errors.password[0]}</p>
              ) : null}
            </div>

            {state?.message ? (
              <p className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">
                {state.message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-full bg-electric px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-electric-dim disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-electric hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
