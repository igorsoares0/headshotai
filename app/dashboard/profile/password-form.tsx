"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { changePassword } from "@/app/actions/auth";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const saved = state?.message === "ok";

  // Clear the typed passwords once the change lands — leaving them sitting in the
  // inputs is the kind of thing that ends up in a screenshot.
  useEffect(() => {
    if (saved) formRef.current?.reset();
  }, [saved]);

  if (!open) {
    return (
      <div className="mt-7 border-t border-line pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Password</p>
            <p className="mt-0.5 text-sm text-muted">
              Changing it signs out every other device.
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="rounded-full border border-line-strong px-4 py-2 text-sm font-semibold transition-colors hover:bg-ink/5"
          >
            Change password
          </button>
        </div>
        {saved ? <p className="mt-3 text-sm text-electric">Password updated.</p> : null}
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className="mt-7 border-t border-line pt-6">
      <p className="text-sm font-semibold">Change password</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="kicker text-muted">Current password</span>
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none transition-colors focus:border-electric"
          />
          {state?.errors?.currentPassword ? (
            <span className="mt-1 block text-xs text-danger">
              {state.errors.currentPassword[0]}
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className="kicker text-muted">New password</span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="At least 8 characters"
            className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none transition-colors focus:border-electric"
          />
          {state?.errors?.password ? (
            <span className="mt-1 block text-xs text-danger">{state.errors.password[0]}</span>
          ) : null}
        </label>
      </div>

      {state?.message && state.message !== "ok" ? (
        <p className="mt-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition active:scale-[0.97] hover:bg-ink-raised disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Updating…" : "Update password"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          Cancel
        </button>
        {saved ? <span className="text-sm text-electric">Password updated.</span> : null}
      </div>
    </form>
  );
}
