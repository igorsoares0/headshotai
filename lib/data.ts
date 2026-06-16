// Mock data for the static UI layer (no backend yet).

export type Pkg = {
  id: string;
  name: string;
  price: number;
  headshots: number;
  styles: number;
  blurb: string;
  features: string[];
  featured?: boolean;
};

export const packages: Pkg[] = [
  {
    id: "starter",
    name: "Starter",
    price: 29,
    headshots: 40,
    styles: 10,
    blurb: "Enough variety for a fresh profile photo.",
    features: ["40 headshots", "10 styles", "2K resolution", "~30 min delivery"],
  },
  {
    id: "professional",
    name: "Professional",
    price: 49,
    headshots: 120,
    styles: 30,
    blurb: "The sweet spot for professionals and teams.",
    features: [
      "120 headshots",
      "30 styles",
      "4K upscaling",
      "Priority queue",
      "Identity model saved",
    ],
    featured: true,
  },
  {
    id: "executive",
    name: "Executive",
    price: 99,
    headshots: 300,
    styles: 50,
    blurb: "Maximum range for personal brands and execs.",
    features: [
      "300 headshots",
      "50 styles",
      "4K upscaling",
      "Fastest queue",
      "Unlimited regenerations*",
    ],
  },
];

export type Style = { name: string; category: string };

export const styleCategories: { category: string; styles: string[] }[] = [
  { category: "Corporate", styles: ["Executive", "CEO", "Finance"] },
  { category: "Technology", styles: ["Software Engineer", "Founder", "Product"] },
  { category: "Healthcare", styles: ["Doctor", "Dentist", "Therapist"] },
  { category: "Legal", styles: ["Lawyer", "Attorney"] },
  { category: "Sales", styles: ["Realtor", "Consultant"] },
  { category: "Personal Brand", styles: ["Creator", "Coach", "Speaker"] },
];

export const orderStates = [
  "PENDING_UPLOAD",
  "VALIDATING",
  "AWAITING_PAYMENT",
  "TRAINING",
  "GENERATING",
  "UPSCALING",
  "READY",
] as const;

export type OrderState = (typeof orderStates)[number] | "FAILED";

export type Order = {
  id: string;
  pkg: string;
  date: string;
  status: OrderState;
  headshots: number;
};

export const orders: Order[] = [
  { id: "AP-2041", pkg: "Professional", date: "Jun 14, 2026", status: "READY", headshots: 120 },
  { id: "AP-1987", pkg: "Starter", date: "May 02, 2026", status: "READY", headshots: 40 },
  { id: "AP-1840", pkg: "Executive", date: "Mar 19, 2026", status: "GENERATING", headshots: 300 },
  { id: "AP-1755", pkg: "Starter", date: "Feb 08, 2026", status: "FAILED", headshots: 0 },
];

export type Shot = {
  id: string;
  style: string;
  category: string;
  score: number;
  seed: number;
  favorite?: boolean;
};

// deterministic gallery
const stylesFlat = styleCategories.flatMap((c) =>
  c.styles.map((s) => ({ style: s, category: c.category })),
);

export const gallery: Shot[] = Array.from({ length: 18 }, (_, i) => {
  const base = stylesFlat[i % stylesFlat.length];
  return {
    id: `shot-${i + 1}`,
    style: base.style,
    category: base.category,
    score: 88 + ((i * 7) % 12),
    seed: i * 137 + 11,
    favorite: [1, 4, 5, 9, 12].includes(i),
  };
});

export const stats = [
  { value: "120+", label: "Studio styles" },
  { value: "4K", label: "Upscaled output" },
  { value: "~30m", label: "Avg. delivery" },
  { value: "10M+", label: "Headshots made" },
];
