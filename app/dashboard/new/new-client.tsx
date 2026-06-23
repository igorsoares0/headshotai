"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Topbar } from "@/app/dashboard/_components/topbar";
import { GENDERS, ETHNICITIES, STYLES, STYLE_KEYS, MAX_LOOKS } from "@/lib/recipe";

// A varied default selection so the user isn't forced to pick before starting.
const DEFAULT_LOOKS = ["gray_navysuit", "white_blazer", "office_shirt", "park_shirt"].filter((k) =>
  STYLE_KEYS.includes(k),
);

export function NewClient({ pack }: { pack: { name: string; photoCount: number } }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [gender, setGender] = useState("");
  const [ethnicity, setEthnicity] = useState("");
  const [looks, setLooks] = useState<string[]>(DEFAULT_LOOKS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleLook(key: string) {
    setLooks((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : prev.length < MAX_LOOKS
          ? [...prev, key]
          : prev, // at the cap — ignore until one is removed
    );
  }

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
      fd.append("gender", gender);
      fd.append("ethnicity", ethnicity);
      looks.forEach((k) => fd.append("looks", k));
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
      <Topbar title="New headshots" subtitle="Upload selfies to generate your batch" />

      <div className="grid gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1.4fr_1fr]">
        {/* upload */}
        <div className="space-y-6">
          <div className="rounded-card border border-line bg-paper-raised p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold tracking-tight">Upload selfies</h2>
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
                  <div key={p.key} className="group relative aspect-square overflow-hidden rounded-lg border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
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

          {/* subject — anchors gender/ethnicity in the prompt so the model
              keeps your identity instead of drifting */}
          <div className="rounded-card border border-line bg-paper-raised p-6">
            <h2 className="font-bold tracking-tight">Who are these photos of?</h2>
            <p className="mt-1 text-xs text-muted">
              Helps the model keep your gender and features consistent.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="kicker text-muted">Gender</span>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm focus:border-electric focus:outline-none"
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {GENDERS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="kicker text-muted">Ethnicity (optional)</span>
                <select
                  value={ethnicity}
                  onChange={(e) => setEthnicity(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm focus:border-electric focus:outline-none"
                >
                  {ETHNICITIES.map((x) => (
                    <option key={x.value} value={x.value}>
                      {x.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* looks — the user picks which styles to generate; overgen is split
              across these, so fewer picks = more shots per look */}
          <div className="rounded-card border border-line bg-paper-raised p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold tracking-tight">Pick your looks</h2>
              <span className="kicker text-muted">
                {looks.length}/{MAX_LOOKS} selected
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">Choose up to {MAX_LOOKS}. Outfit · background.</p>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {STYLE_KEYS.map((key) => {
                const on = looks.includes(key);
                const atCap = looks.length >= MAX_LOOKS;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleLook(key)}
                    disabled={!on && atCap}
                    className={`rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors ${
                      on
                        ? "border-electric bg-electric/5 text-ink"
                        : atCap
                          ? "cursor-not-allowed border-line bg-paper text-muted/50"
                          : "border-line bg-paper text-muted hover:border-electric hover:text-ink"
                    }`}
                  >
                    {STYLES[key].label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* pack summary + submit */}
        <div className="space-y-6">
          <div className="rounded-card border border-line bg-paper-raised p-6">
            <h2 className="font-bold tracking-tight">Your pack</h2>
            <div className="mt-4 flex items-center justify-between rounded-xl border border-electric bg-electric/5 p-4">
              <span>
                <span className="block text-sm font-semibold">{pack.name}</span>
                <span className="block text-xs text-muted">
                  {pack.photoCount} headshots · {looks.length} look{looks.length === 1 ? "" : "s"}
                </span>
              </span>
              <span className="grid h-5 w-5 place-items-center rounded-full bg-electric text-[11px] text-white">✓</span>
            </div>
            <p className="mt-3 text-xs text-muted">
              We&apos;ll generate and identity-check your photos, then deliver the best {pack.photoCount}.
            </p>
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">{error}</p>
          )}

          <button
            disabled={files.length < 10 || !gender || looks.length === 0 || submitting}
            onClick={submit}
            className="w-full rounded-full bg-electric px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-electric-dim disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting
              ? "Starting…"
              : files.length < 10
                ? `Add ${10 - files.length} more photos`
                : !gender
                  ? "Select who these photos are of"
                  : looks.length === 0
                    ? "Pick at least one look"
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
