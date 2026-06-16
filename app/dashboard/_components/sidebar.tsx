"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/dashboard/orders", label: "Orders", icon: "box" },
  { href: "/dashboard/gallery", label: "Gallery", icon: "image" },
  { href: "/dashboard/favorites", label: "Favorites", icon: "star" },
  { href: "/dashboard/billing", label: "Billing", icon: "card" },
  { href: "/dashboard/profile", label: "Profile", icon: "user" },
] as const;

function Icon({ name }: { name: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "box":
      return (
        <svg {...common}>
          <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
          <path d="M3 8l9 5 9-5M12 13v8" />
        </svg>
      );
    case "image":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      );
    case "star":
      return (
        <svg {...common}>
          <path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18.8 6.2 21.8l1.1-6.5L2.6 9.8l6.5-.9z" />
        </svg>
      );
    case "card":
      return (
        <svg {...common}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      );
    default:
      return null;
  }
}

export function Sidebar() {
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
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
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

      {/* credits */}
      <div className="m-3 rounded-card border border-line bg-paper p-4">
        <div className="flex items-center justify-between">
          <p className="kicker text-muted">Credits</p>
          <span className="text-sm font-bold">82</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-sunken">
          <div className="h-full w-[68%] rounded-full bg-electric" />
        </div>
        <Link
          href="/dashboard/billing"
          className="mt-3 block rounded-full bg-electric px-3 py-2 text-center text-xs font-semibold text-white transition-colors hover:bg-electric-dim"
        >
          Top up
        </Link>
      </div>

      <div className="flex items-center gap-3 border-t border-line px-4 py-4">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-electric text-sm font-bold text-white">
          IS
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Igor S.</p>
          <p className="truncate text-xs text-muted">igoooorsrs@gmail.com</p>
        </div>
      </div>
    </aside>
  );
}
