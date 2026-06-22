"use client";

import { useState, useTransition } from "react";
import { resendVerification } from "@/app/actions/auth";

export function VerifyNotice({ email }: { email: string }) {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);

  return (
    <div className="mx-auto max-w-md rounded-card border border-line bg-paper-raised p-7 text-center">
      <h1 className="text-xl font-extrabold tracking-tight">Confirm your email first</h1>
      <p className="mt-3 text-sm text-muted">
        We sent a verification link to <span className="font-semibold text-ink">{email}</span>.
        Click it to unlock headshot generation. Check your spam folder if it&apos;s not there.
      </p>

      {sent ? (
        <p className="mt-6 rounded-xl border border-line bg-paper px-4 py-3 text-sm text-muted">
          Sent — check your inbox.
        </p>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => { await resendVerification(); setSent(true); })}
          className="mt-6 rounded-full bg-electric px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-electric-dim disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Sending…" : "Resend verification email"}
        </button>
      )}
    </div>
  );
}
