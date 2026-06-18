/**
 * The product catalog — three one-time Paddle packs. Single source of truth for
 * pricing/contents (reqs §8 reworked: no credits, one-time purchase per batch).
 * Safe to import from client components: NO Paddle price ids here (those are
 * server-only env, resolved in lib/paddle.ts). 1 purchase = 1 delivered batch.
 */
export interface Pack {
  id: "starter" | "pro" | "premium";
  name: string;
  price: number; // USD, one-time
  photoCount: number; // delivered headshots that pass the identity gate
  blurb: string;
  features: string[];
  featured?: boolean;
}

export const PACKS: Pack[] = [
  {
    id: "starter",
    name: "Starter",
    price: 25,
    photoCount: 30,
    blurb: "Enough variety for a fresh profile photo.",
    features: ["30 headshots", "4 studio styles", "Identity-matched", "~30 min delivery"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 40,
    photoCount: 50,
    blurb: "The sweet spot for professionals.",
    features: ["50 headshots", "4 studio styles", "Identity-matched", "Priority queue"],
    featured: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: 59,
    photoCount: 80,
    blurb: "Maximum range for personal brands.",
    features: ["80 headshots", "4 studio styles", "Identity-matched", "Fastest queue"],
  },
];

export function packById(id: string): Pack | undefined {
  return PACKS.find((p) => p.id === id);
}
