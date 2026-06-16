import { Topbar } from "@/app/dashboard/_components/topbar";

export default function ProfilePage() {
  return (
    <>
      <Topbar title="Profile" subtitle="Account and AI identity model" />

      <div className="grid gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1.4fr_1fr]">
        {/* details form */}
        <div className="rounded-card border border-line bg-paper-raised p-6 sm:p-8">
          <h2 className="font-bold tracking-tight">Account details</h2>
          <div className="mt-6 flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-electric text-xl font-bold text-white">
              IS
            </span>
            <button className="rounded-full border border-line-strong px-4 py-2 text-sm font-medium transition-colors hover:bg-ink/5">
              Change avatar
            </button>
          </div>

          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <Field label="Full name" defaultValue="Igor S." />
            <Field label="Email" defaultValue="igoooorsrs@gmail.com" type="email" />
            <Field label="Company" defaultValue="Aperture Labs" />
            <Field label="Role" defaultValue="Founder" />
          </div>

          <div className="mt-7 flex gap-3">
            <button className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-ink-raised">
              Save changes
            </button>
            <button className="rounded-full px-5 py-2.5 text-sm font-medium text-muted hover:text-ink">
              Cancel
            </button>
          </div>
        </div>

        {/* identity model */}
        <div className="space-y-6">
          <div className="rounded-card border border-line bg-paper-raised p-6">
            <p className="kicker text-muted">AI identity model</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-electric" />
              <p className="font-bold tracking-tight">Trained &amp; ready</p>
            </div>
            <p className="mt-2 text-sm text-muted">
              Trained on 18 selfies · v2 · Jun 14, 2026. Generate new styles
              anytime without re-uploading.
            </p>
            <button className="mt-5 w-full rounded-full bg-electric px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-electric-dim">
              Retrain model
            </button>
          </div>

          <div className="rounded-card border border-red-500/30 bg-red-500/5 p-6">
            <p className="font-bold tracking-tight text-red-600">Danger zone</p>
            <p className="mt-2 text-sm text-muted">
              Delete your identity model and all generated headshots. This cannot
              be undone.
            </p>
            <button className="mt-5 rounded-full border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-500/10">
              Delete account
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  defaultValue,
  type = "text",
}: {
  label: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="kicker text-muted">{label}</span>
      <input
        type={type}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none transition-colors focus:border-electric"
      />
    </label>
  );
}
