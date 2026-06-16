// Deterministic portrait placeholder — stands in for a generated headshot
// until real images exist. Uses a layered gradient + grain so the UI reads
// as "photos" without shipping any assets.

const palettes = [
  ["#2b2f3a", "#0c0d12"],
  ["#3a2f2a", "#100c0a"],
  ["#27343a", "#0a1014"],
  ["#343042", "#100e16"],
  ["#2c3a32", "#0a120d"],
  ["#3a2f38", "#140d12"],
];

function rng(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function Portrait({
  seed = 1,
  className = "",
  label,
}: {
  seed?: number;
  className?: string;
  label?: string;
}) {
  const [a, b] = palettes[Math.floor(rng(seed) * palettes.length)];
  const angle = Math.floor(rng(seed + 1) * 360);
  const cx = 30 + Math.floor(rng(seed + 2) * 40);
  const cy = 22 + Math.floor(rng(seed + 3) * 26);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(120% 90% at ${cx}% ${cy}%, ${a} 0%, ${b} 70%), linear-gradient(${angle}deg, ${a}, ${b})`,
      }}
    >
      {/* soft "head + shoulders" silhouette */}
      <svg
        className="absolute inset-0 h-full w-full opacity-90"
        viewBox="0 0 100 120"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <radialGradient id={`g-${seed}`} cx="50%" cy="38%" r="60%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        <rect width="100" height="120" fill={`url(#g-${seed})`} />
        <ellipse cx="50" cy="44" rx="17" ry="20" fill="rgba(255,255,255,0.07)" />
        <path
          d="M22 120 C24 92 36 78 50 78 C64 78 76 92 78 120 Z"
          fill="rgba(255,255,255,0.06)"
        />
      </svg>
      {/* grain */}
      <div
        className="absolute inset-0 mix-blend-overlay opacity-40"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      {label ? (
        <span className="kicker absolute bottom-2 left-2 rounded-full bg-black/35 px-2 py-1 text-[10px] text-white/90 backdrop-blur-sm">
          {label}
        </span>
      ) : null}
    </div>
  );
}
