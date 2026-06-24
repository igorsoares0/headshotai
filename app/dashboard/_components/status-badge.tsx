const styles: Record<string, string> = {
  READY: "bg-electric/10 text-electric border-electric/30",
  FAILED: "bg-danger/10 text-danger border-danger/30",
  default: "bg-ink/5 text-ink/70 border-line-strong",
};

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "READY" ? styles.READY : status === "FAILED" ? styles.FAILED : styles.default;
  const live = status !== "READY" && status !== "FAILED";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] tracking-wide ${tone}`}
    >
      {live ? (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      ) : null}
      {status.replace(/_/g, " ")}
    </span>
  );
}
