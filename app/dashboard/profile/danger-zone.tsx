"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "@/app/actions/profile";

export function DangerZone() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();

  const armed = confirm.trim().toUpperCase() === "DELETE";

  return (
    <div className="rounded-card border border-red-500/30 bg-red-500/5 p-6">
      <p className="font-bold tracking-tight text-red-600">Danger zone</p>
      <p className="mt-2 text-sm text-muted">
        Delete your account, identity model and all generated headshots. This cannot be undone.
      </p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-5 rounded-full border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-500/10"
        >
          Delete account
        </button>
      ) : (
        <div className="mt-5">
          <label className="block text-xs font-medium text-muted">
            Type <span className="font-bold text-red-600">DELETE</span> to confirm
            <input
              autoFocus
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-red-500/40 bg-paper px-4 py-2.5 text-sm outline-none focus:border-red-600"
              placeholder="DELETE"
            />
          </label>
          <div className="mt-3 flex items-center gap-3">
            <button
              disabled={!armed || pending}
              onClick={() => start(() => deleteAccount())}
              className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? "Deleting…" : "Permanently delete"}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setConfirm("");
              }}
              className="text-sm font-medium text-muted hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
