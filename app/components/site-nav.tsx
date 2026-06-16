import Link from "next/link";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#styles", label: "Styles" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-paper">
            <span className="block h-2.5 w-2.5 rounded-full border-2 border-electric" />
          </span>
          <span className="text-lg font-extrabold tracking-tight">aperture</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/5 sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full bg-electric px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-electric-dim"
          >
            Start now
          </Link>
        </div>
      </div>
    </header>
  );
}
