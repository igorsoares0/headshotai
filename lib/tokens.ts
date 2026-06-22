import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type TokenType = "verify_email" | "reset_password";

// How long each kind of link stays valid.
const TTL_MS: Record<TokenType, number> = {
  verify_email: 24 * 60 * 60 * 1000, // 24h
  reset_password: 60 * 60 * 1000, // 1h
};

const sha256 = (raw: string) => createHash("sha256").update(raw).digest("hex");

/**
 * Issue a fresh single-use token for `userId`, invalidating any prior unconsumed
 * tokens of the same type. Returns the RAW token — store nothing of it elsewhere;
 * it only belongs in the emailed link. The DB keeps just its hash.
 */
export async function issueToken(userId: string, type: TokenType): Promise<string> {
  const raw = randomBytes(32).toString("base64url");

  await prisma.$transaction([
    prisma.verificationToken.updateMany({
      where: { userId, type, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.verificationToken.create({
      data: {
        userId,
        type,
        tokenHash: sha256(raw),
        expiresAt: new Date(Date.now() + TTL_MS[type]),
      },
    }),
  ]);

  return raw;
}

/**
 * Validate and atomically consume a token. Returns the owning userId on success,
 * or null if the token is unknown, wrong type, already used, or expired.
 */
export async function consumeToken(raw: string, type: TokenType): Promise<string | null> {
  if (!raw) return null;
  const row = await prisma.verificationToken.findUnique({
    where: { tokenHash: sha256(raw) },
  });
  if (!row || row.type !== type || row.consumedAt || row.expiresAt < new Date()) {
    return null;
  }

  // Single-use: only the first caller that flips consumedAt wins.
  const claimed = await prisma.verificationToken.updateMany({
    where: { id: row.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (claimed.count !== 1) return null;

  return row.userId;
}
