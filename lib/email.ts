import "server-only";
import { createHash } from "node:crypto";
import { Resend } from "resend";

// Lazily constructed so a missing key only errors when we actually send (and so
// builds without RESEND_API_KEY don't crash at import time).
let client: Resend | null = null;
function resend(): Resend {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

const FROM = process.env.AUTH_EMAIL_FROM ?? "HeadshotAI <onboarding@resend.dev>";

// Browser-reachable origin for the links we email. Falls back to localhost in dev.
export function appBaseUrl(): string {
  return (
    process.env.APP_BASE_URL ??
    process.env.AUTH_URL ??
    process.env.WEBHOOK_BASE_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

// The SDK returns { data, error } and does NOT throw — we surface failures to the
// caller so an undeliverable email doesn't silently look like success.
async function send(to: string, subject: string, html: string): Promise<void> {
  const { error } = await resend().emails.send(
    { from: FROM, to, subject, html },
    // Same recipient + same body => same key => safe retry; a new link => new key
    // => no 409. The recipient MUST be in the hash: emails whose body carries no
    // per-user token (see sendExistingAccountEmail) would otherwise collide across
    // users, and the second recipient's mail would be dropped as a duplicate.
    {
      idempotencyKey: `auth/${createHash("sha256").update(`${to}\n${html}`).digest("hex").slice(0, 32)}`,
    },
  );
  if (error) throw new Error(`Email send failed: ${error.message}`);
}

const shell = (heading: string, body: string, cta: string, href: string) => `
  <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
    <h1 style="font-size:20px;font-weight:800">${heading}</h1>
    <p style="font-size:14px;line-height:1.6;color:#444">${body}</p>
    <p style="margin:24px 0">
      <a href="${href}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:9999px">${cta}</a>
    </p>
    <p style="font-size:12px;color:#888">If the button doesn't work, paste this link into your browser:<br>${href}</p>
  </div>`;

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const href = `${appBaseUrl()}/verify?token=${encodeURIComponent(token)}`;
  await send(
    to,
    "Confirm your email",
    shell(
      "Confirm your email",
      "Tap below to verify your email address. This link expires in 24 hours.",
      "Verify email",
      href,
    ),
  );
}

export async function sendOrderReadyEmail(
  to: string,
  orderId: string,
  count: number,
  firstName?: string,
): Promise<void> {
  const href = `${appBaseUrl()}/dashboard/orders/${orderId}`;
  const hi = firstName ? `${firstName}, your` : "Your";
  await send(
    to,
    "Your headshots are ready",
    shell(
      "Your headshots are ready 🎉",
      `${hi} batch is done — ${count} professional headshot${count === 1 ? "" : "s"} are ready to view and download.`,
      "View my headshots",
      href,
    ),
  );
}

/**
 * Sent when someone tries to sign up with an address that already has an account.
 * This email is what lets the signup form answer identically either way: the
 * "an account already exists" fact goes to the inbox that owns the address, not
 * to whoever typed it into the form.
 */
export async function sendExistingAccountEmail(to: string): Promise<void> {
  const href = `${appBaseUrl()}/login`;
  await send(
    to,
    "You already have an account",
    shell(
      "You already have an account",
      "Someone just tried to sign up with this email address. An account already exists for it, so we didn't create a second one and nothing has changed." +
        "<br><br>If that was you, sign in below — and use &ldquo;Forgot password&rdquo; on that page if you can't remember your password. If it wasn't you, you can safely ignore this email.",
      "Sign in",
      href,
    ),
  );
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const href = `${appBaseUrl()}/reset?token=${encodeURIComponent(token)}`;
  await send(
    to,
    "Reset your password",
    shell(
      "Reset your password",
      "Tap below to choose a new password. This link expires in 1 hour. If you didn't request this, you can ignore this email.",
      "Reset password",
      href,
    ),
  );
}
