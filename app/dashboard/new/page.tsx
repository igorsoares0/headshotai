"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Topbar } from "@/app/dashboard/_components/topbar";
import { packages } from "@/lib/data";

export default function NewBatchPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState("professional");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previews = useMemo(
    () => files.map((f) => ({ key: f.name + f.size, url: URL.createObjectURL(f) })),
    [files],
  );
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...incoming].slice(0, 25));
    setError(null);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("photos", f));
      fd.append("packId", selected);
      const res = await fetch("/api/orders", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong");
      router.push(`/dashboard/orders/${json.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start");
      setSubmitting(false);
    }
  }

  return (
    <>
      <Topbar title="New headshots" subtitle="Upload selfies and pick a pack" />

      <div className="grid gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1.4fr_1fr]">
        {/* upload */}
        <div className="space-y-6">
          <div className="rounded-card border border-line bg-paper-raised p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold tracking-tight">1 · Upload selfies</h2>
              <span className="kicker text-muted">{files.length}/25 added</span>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => addFiles(e.target.files)}
            />

            <label
              onClick={(e) => {
                e.preventDefault();
                inputRef.current?.click();
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
              }}
              className="mt-5 grid cursor-pointer place-items-center rounded-card border-2 border-dashed border-line-strong bg-paper py-12 text-center transition-colors hover:border-electric hover:bg-paper-sunken"
            >
              <div className="grid h-12 w-12 place-items-center rounded-full bg-ink text-paper">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 16V4m0 0L7 9m5-5 5 5" />
                  <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
                </svg>
              </div>
              <p className="mt-4 text-sm font-semibold">Drag &amp; drop or click to upload</p>
              <p className="mt-1 text-xs text-muted">JPG, JPEG or PNG · up to 15MB each · 10–25 photos</p>
            </label>

            {/* thumbnails */}
            {previews.length > 0 && (
              <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-6">
                {previews.map((p, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <div key={p.key} className="group relative aspect-square overflow-hidden rounded-lg border border-line">
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                    <button
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-ink/80 text-[11px] text-paper opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* requirements checklist */}
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {[
                "One clear face per photo",
                "Min 1024px resolution",
                "No sunglasses or masks",
                "Varied angles & lighting",
              ].map((r) => (
                <li key={r} className="flex items-center gap-2 text-sm text-muted">
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-ink text-[10px] text-paper">✓</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* pack + submit */}
        <div className="space-y-6">
          <div className="rounded-card border border-line bg-paper-raised p-6">
            <h2 className="font-bold tracking-tight">2 · Choose a pack</h2>
            <div className="mt-5 space-y-3">
              {packages.map((p) => {
                const active = selected === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p.id)}
                    className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors ${
                      active ? "border-electric bg-electric/5" : "border-line hover:bg-paper-sunken"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`grid h-5 w-5 place-items-center rounded-full border ${active ? "border-electric bg-electric text-white" : "border-line-strong"}`}>
                        {active ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{p.name}</span>
                        <span className="block text-xs text-muted">{p.headshots} shots · {p.styles} styles</span>
                      </span>
                    </span>
                    <span className="text-lg font-extrabold tracking-tight">${p.price}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">{error}</p>
          )}

          <button
            disabled={files.length < 10 || submitting}
            onClick={submit}
            className="w-full rounded-full bg-electric px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-electric-dim disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting
              ? "Starting…"
              : files.length < 10
                ? `Add ${10 - files.length} more photos`
                : "Start training →"}
          </button>
          <Link href="/dashboard" className="block text-center text-sm font-medium text-muted hover:text-ink">
            Cancel
          </Link>
        </div>
      </div>
    </>
  );
}
