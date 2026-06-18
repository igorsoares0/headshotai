// Static copy for the marketing/landing layer. Product data (packs, orders,
// gallery) now comes from lib/packs.ts + the live store/Prisma — not from here.

export type Style = { name: string; category: string };

export const styleCategories: { category: string; styles: string[] }[] = [
  { category: "Corporate", styles: ["Executive", "CEO", "Finance"] },
  { category: "Technology", styles: ["Software Engineer", "Founder", "Product"] },
  { category: "Healthcare", styles: ["Doctor", "Dentist", "Therapist"] },
  { category: "Legal", styles: ["Lawyer", "Attorney"] },
  { category: "Sales", styles: ["Realtor", "Consultant"] },
  { category: "Personal Brand", styles: ["Creator", "Coach", "Speaker"] },
];

export const stats = [
  { value: "120+", label: "Studio styles" },
  { value: "4K", label: "Upscaled output" },
  { value: "~30m", label: "Avg. delivery" },
  { value: "10M+", label: "Headshots made" },
];
