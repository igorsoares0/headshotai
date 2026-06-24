"use client";

import { useActionState } from "react";
import { updateName } from "@/app/actions/profile";

export function AccountForm({
  initialName,
  email,
  verified,
}: {
  initialName: string;
  email: string;
  verified: boolean;
}) {
  const [state, action, pending] = useActionState(updateName, undefined);
  const saved = state?.message === "ok";

  return (
    <form action={action} className="mt-7 grid gap-5 sm:grid-cols-2">
      <label className="block">
        <span className="kicker text-muted">Full name</span>
        <input
          name="name"
          type="text"
          defaultValue={initialName}
          required
          className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none transition-colors focus:border-electric"
        />
        {state?.errors?.name ? (
          <span className="mt-1 block text-xs text-danger">{state.errors.name[0]}</span>
        ) : null}
      </label>

      <label className="block">
        <span className="kicker text-muted">Email</span>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="email"
            defaultValue={email}
            disabled
            className="w-full rounded-xl border border-line bg-paper-sunken px-4 py-2.5 text-sm text-muted outline-none"
          />
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              verified
                ? "border-electric/30 bg-electric/10 text-electric"
                : "border-amber-500/30 bg-amber-500/10 text-amber-700"
            }`}
          >
            {verified ? "Verified" : "Unverified"}
          </span>
        </div>
      </label>

      <div className="sm:col-span-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition active:scale-[0.97] hover:bg-ink-raised disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        {saved ? <span className="text-sm text-electric">Saved.</span> : null}
      </div>
    </form>
  );
}
