"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword } from "@/app/actions/auth";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, undefined);

  if (state?.message === "ok") {
    return (
      <div className="mt-6 space-y-4">
        <p className="rounded-xl border border-line bg-paper px-4 py-3 text-sm text-muted">
          Your password has been updated.
        </p>
        <Link
          href="/login"
          className="block w-full rounded-full bg-electric px-5 py-3.5 text-center text-sm font-semibold text-white transition active:scale-[0.97] hover:bg-electric-dim"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="password" className="kicker text-muted">New password</label>
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
          <p className="mt-1 text-xs text-danger">{state.errors.password[0]}</p>
        ) : null}
      </div>

      {state?.message && state.message !== "ok" ? (
        <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-electric px-5 py-3.5 text-sm font-semibold text-white transition active:scale-[0.97] hover:bg-electric-dim disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
