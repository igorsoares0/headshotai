import Link from "next/link";
import { SiteNav } from "@/app/components/site-nav";
import { SiteFooter } from "@/app/components/site-footer";
import { LAST_UPDATED } from "@/lib/legal";

const DOCS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refunds", label: "Refunds" },
];

/**
 * Shared shell for the three legal documents. Each page supplies its own
 * <h1> + intro; this handles the chrome, the cross-links between documents and
 * the "last updated" stamp that every one of them needs to carry.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <SiteNav />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_200px] lg:gap-16">
            <div className="legal-prose">{children}</div>

            {/* Sibling documents — someone reading the refund policy is often
                one click from wanting the terms. */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <p className="kicker text-muted">Legal</p>
              <ul className="mt-4 space-y-2.5">
                {DOCS.map((d) => (
                  <li key={d.href}>
                    <Link
                      href={d.href}
                      className="text-sm text-muted transition-colors hover:text-ink"
                    >
                      {d.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-t border-line pt-4 text-xs text-muted">
                Last updated
                <br />
                {LAST_UPDATED}
              </p>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
