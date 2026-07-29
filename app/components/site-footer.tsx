import Link from "next/link";
import { ENTITY, SUPPORT_EMAIL } from "@/lib/legal";

// `href: null` = not built yet, rendered as plain text rather than a link that
// goes nowhere. The legal column is real and must stay wired: Paddle requires
// these three to be publicly reachable.
const cols: { title: string; items: { label: string; href: string | null }[] }[] = [
  {
    title: "Product",
    items: [
      { label: "How it works", href: "/#how" },
      { label: "Styles", href: "/#styles" },
      { label: "Pricing", href: "/#pricing" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Company",
    items: [
      { label: "About", href: null },
      { label: "Careers", href: null },
      { label: "Blog", href: null },
      { label: "Contact", href: `mailto:${SUPPORT_EMAIL}` },
    ],
  },
  {
    title: "Legal",
    items: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Licensing", href: "/terms#license" },
      { label: "Refunds", href: "/refunds" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* CTA band */}
        <div className="grid gap-8 border-b border-line-invert py-16 md:grid-cols-[1.4fr_1fr] md:items-end">
          <h2 className="display text-4xl text-paper sm:text-5xl">
            Your next headshot is
            <br />
            <span className="text-electric-bright">thirty minutes away.</span>
          </h2>
          <div className="flex flex-col gap-3 md:items-end">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-electric px-6 py-3 text-sm font-semibold text-white transition active:scale-[0.97] hover:bg-electric-bright"
            >
              Upload your selfies →
            </Link>
            <p className="kicker text-muted-dark">No photographer · No studio</p>
          </div>
        </div>

        {/* Link columns */}
        <div className="grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <span className="text-lg font-extrabold tracking-tight">aperture</span>
            <p className="mt-3 max-w-xs text-sm text-muted-dark">
              Studio-quality AI headshots from a handful of selfies.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <p className="kicker text-muted-dark">{c.title}</p>
              <ul className="mt-4 space-y-2.5">
                {c.items.map((i) => (
                  <li key={i.label}>
                    {i.href ? (
                      <Link
                        href={i.href}
                        className="text-sm text-paper/80 transition-colors hover:text-electric-bright"
                      >
                        {i.label}
                      </Link>
                    ) : (
                      <span className="text-sm text-paper/40">{i.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Giant wordmark, echoing the reference footer */}
      <div className="overflow-hidden border-t border-line-invert">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <p className="select-none py-6 text-[22vw] font-black leading-none tracking-tighter text-paper/[0.06]">
            aperture
          </p>
        </div>
      </div>

      <div className="border-t border-line-invert">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-muted-dark sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>© 2026 {ENTITY}</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link href="/terms" className="transition-colors hover:text-paper">
              Terms
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-paper">
              Privacy
            </Link>
            <Link href="/refunds" className="transition-colors hover:text-paper">
              Refunds
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
