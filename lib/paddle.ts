import "server-only";
import { Environment, Paddle } from "@paddle/paddle-node-sdk";

/** Server-side Paddle client + price/secret resolution (env is server-only). */
const environment =
  process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
    ? Environment.production
    : Environment.sandbox;

export const paddle = new Paddle(process.env.PADDLE_API_KEY ?? "", { environment });

export const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET ?? "";

const PRICE_IDS: Record<string, string | undefined> = {
  starter: process.env.PADDLE_PRICE_STARTER,
  pro: process.env.PADDLE_PRICE_PRO,
  premium: process.env.PADDLE_PRICE_PREMIUM,
};

export function priceIdFor(packId: string): string {
  const id = PRICE_IDS[packId];
  if (!id) throw new Error(`No Paddle price configured for pack "${packId}"`);
  return id;
}
