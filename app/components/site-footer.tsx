import Link from "next/link";

const cols = [
  { title: "Product", items: ["How it works", "Styles", "Pricing", "Gallery"] },
  { title: "Company", items: ["About", "Careers", "Blog", "Contact"] },
  { title: "Legal", items: ["Privacy", "Terms", "Licensing", "Refunds"] },
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
                  <li key={i}>
                    <a
                      href="#"
                      className="text-sm text-paper/80 transition-colors hover:text-electric-bright"
                    >
                      {i}
                    </a>
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
          <span>© 2026 Aperture Labs, Inc.</span>
          <span className="kicker">Made with AI · Shipped on Vercel</span>
        </div>
      </div>
    </footer>
  );
}
