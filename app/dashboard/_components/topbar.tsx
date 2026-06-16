import Link from "next/link";

export function Topbar({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-line bg-paper/85 px-5 backdrop-blur-md sm:px-8">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-extrabold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="hidden truncate text-xs text-muted sm:block">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-full border border-line bg-paper-raised px-3 py-2 text-sm text-muted md:flex">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3-3" strokeLinecap="round" />
          </svg>
          <span>Search</span>
        </div>
        <Link
          href="/dashboard/new"
          className="rounded-full bg-electric px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-electric-dim"
        >
          New headshots
        </Link>
      </div>
    </div>
  );
}
