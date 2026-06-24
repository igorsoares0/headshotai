"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { Icon, isActive, nav } from "./nav-items";

function initials(name: string | null, email: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return (email?.[0] ?? "?").toUpperCase();
}

export function Sidebar({
  user,
  activePack,
}: {
  user: { name: string | null; email: string | null } | null;
  activePack: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-paper-raised lg:flex">
      <Link href="/" className="flex h-16 items-center gap-2 px-6">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-paper">
          <span className="block h-2.5 w-2.5 rounded-full border-2 border-electric" />
        </span>
        <span className="text-lg font-extrabold tracking-tight">aperture</span>
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {nav.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-ink text-paper"
                  : "text-muted hover:bg-ink/5 hover:text-ink"
              }`}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* entitlement */}
      <div className="m-3 rounded-card border border-line bg-paper p-4">
        <div className="flex items-center justify-between">
          <p className="kicker text-muted">Pack</p>
          <span className="text-sm font-bold">{activePack ?? "None"}</span>
        </div>
        <p className="mt-2 text-xs text-muted">
          {activePack ? "Ready to generate a batch." : "Buy a pack to generate headshots."}
        </p>
        <Link
          href={activePack ? "/dashboard/new" : "/dashboard/billing"}
          className="mt-3 block rounded-full bg-electric px-3 py-2 text-center text-xs font-semibold text-white transition-colors hover:bg-electric-dim"
        >
          {activePack ? "Generate" : "Buy a pack"}
        </Link>
      </div>

      <div className="flex items-center gap-3 border-t border-line px-4 py-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-electric text-sm font-bold text-white">
          {initials(user?.name ?? null, user?.email ?? null)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user?.name ?? "Account"}</p>
          <p className="truncate text-xs text-muted">{user?.email ?? ""}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            title="Sign out"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </button>
        </form>
      </div>
    </aside>
  );
}
