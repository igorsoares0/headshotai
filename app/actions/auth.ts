"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { auth, signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { issueToken, consumeToken } from "@/lib/tokens";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendExistingAccountEmail,
} from "@/lib/email";
import { checkAuthRateLimit } from "@/lib/ratelimit";
import {
  SignupFormSchema,
  ForgotFormSchema,
  ResetFormSchema,
  ChangePasswordFormSchema,
  type FormState,
} from "@/lib/definitions";

/**
 * Floor for the signup response, in ms. Measured locally, creating an account
 * took ~2.3s (bcrypt + insert + token transaction + email) while the
 * already-exists branch returned in ~0.7s. Identical HTML is not enough when the
 * clock gives the answer away, so both branches are held to this budget. Raise it
 * if account creation ever routinely exceeds it.
 */
const SIGNUP_RESPONSE_MS = 2500;

/** Hold until `ms` has elapsed since `startedAt`, so a branch can't finish early. */
async function padTo(startedAt: number, ms: number): Promise<void> {
  const remaining = ms - (Date.now() - startedAt);
  if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
}

/**
 * Create an account — or, if the address already has one, say nothing about it.
 *
 * Both branches send an email and return the identical `{ message: "ok" }`, which
 * the form renders as "check your email". That symmetry is the whole point: a
 * distinguishable response here (the old "an account already exists", or an
 * auto-login that only happens for new addresses) lets anyone test an email
 * address for membership one submission at a time.
 *
 * The cost is that signup no longer signs you straight in — verification-first is
 * what makes the two paths look the same from outside.
 */
export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const startedAt = Date.now();

  // Throttle account creation per IP to blunt automated signup / email-abuse.
  // Not padded: rate-limit and validation replies are decided by what the caller
  // submitted, so they reveal nothing about whether the address has an account.
  const limited = await checkAuthRateLimit("signup", { limit: 5, windowMs: 60 * 60 * 1000 });
  if (limited) return { message: limited };

  const parsed = SignupFormSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { name, email, password } = parsed.data;

  // Hash before looking the address up, so both branches pay the ~100ms bcrypt
  // cost. Skipping it on the "already exists" path would answer noticeably faster
  // and hand back the very signal the wording below is hiding.
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // The address owner gets told; the form does not.
    await sendExistingAccountEmail(email).catch((e) =>
      console.error("existing-account email failed:", e),
    );
  } else {
    try {
      const user = await prisma.user.create({ data: { name, email, passwordHash } });
      // Email starts unverified. The paid action is gated on emailVerified, so an
      // unverified account can't spend anything.
      const token = await issueToken(user.id, "verify_email");
      await sendVerificationEmail(email, token);
    } catch (e) {
      // Covers a flaky email provider (they can resend after signing in) and the
      // unique-constraint race of two simultaneous signups for one address. Both
      // still fall through to the generic response — surfacing an error page for
      // one branch only would be an enumeration oracle of its own.
      console.error("signup failed:", e);
    }
  }

  // Same words, same length of silence.
  await padTo(startedAt, SIGNUP_RESPONSE_MS);
  return { message: "ok" };
}

export async function authenticate(_prev: FormState, formData: FormData): Promise<FormState> {
  // Throttle login attempts. Scoped by IP+email so brute-forcing one account and
  // spraying many accounts from one host both get capped, while normal typos don't
  // lock a whole IP out too aggressively.
  const email = String(formData.get("email") ?? "").toLowerCase();
  const limited = await checkAuthRateLimit("login", {
    limit: 10,
    windowMs: 15 * 60 * 1000,
    scope: email,
  });
  if (limited) return { message: limited };

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
    return undefined;
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        message:
          error.type === "CredentialsSignin"
            ? "Invalid email or password."
            : "Something went wrong. Please try again.",
      };
    }
    throw error; // re-throw the redirect
  }
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

/** Resend the verification link to the currently logged-in, still-unverified user. */
export async function resendVerification(): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false };

  // Cap resends per user so this can't be used to spam a verified address.
  const limited = await checkAuthRateLimit("resend-verify", {
    limit: 3,
    windowMs: 60 * 60 * 1000,
    scope: session.user.id,
  });
  if (limited) return { ok: false };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.emailVerified) return { ok: false };

  try {
    const token = await issueToken(user.id, "verify_email");
    await sendVerificationEmail(user.email, token);
    return { ok: true };
  } catch (e) {
    console.error("resend verification failed:", e);
    return { ok: false };
  }
}

/**
 * Step 1 of reset: always returns the same generic success regardless of whether
 * the email exists — no account enumeration. Sends a link only if there's a match.
 */
export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  // Throttle reset requests per IP to prevent password-reset email flooding. Keep
  // the generic response so this never becomes an account-enumeration oracle.
  const limited = await checkAuthRateLimit("reset-request", { limit: 5, windowMs: 60 * 60 * 1000 });
  if (limited) {
    return { message: "If an account exists for that email, we've sent a reset link." };
  }

  const parsed = ForgotFormSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    try {
      const token = await issueToken(user.id, "reset_password");
      await sendPasswordResetEmail(email, token);
    } catch (e) {
      console.error("reset email failed:", e);
    }
  }

  return { message: "If an account exists for that email, we've sent a reset link." };
}

/** Step 2 of reset: validate the token, set the new password, consume the token. */
export async function resetPassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  // Cap token submissions per IP — tokens are 256-bit random so guessing is already
  // infeasible, but this stops any automated hammering of the endpoint.
  const limited = await checkAuthRateLimit("reset-submit", { limit: 10, windowMs: 15 * 60 * 1000 });
  if (limited) return { message: limited };

  const parsed = ResetFormSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const userId = await consumeToken(parsed.data.token, "reset_password");
  if (!userId) {
    return { message: "This reset link is invalid or has expired. Request a new one." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  // Stamp passwordChangedAt so any JWT session issued before now is revoked on its
  // next request (see the jwt callback in auth.ts) — a reset must log out sessions
  // an attacker may already hold.
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, passwordChangedAt: new Date() },
  });

  return { message: "ok" };
}

/**
 * Change the password of the signed-in user. Requires the current password: a
 * session alone must not be enough to take an account over, since a session can
 * be borrowed (shared machine, stolen cookie) while the password cannot.
 *
 * Like a reset, this stamps `passwordChangedAt`, which revokes every JWT minted
 * before now — the point of changing a password is to evict whoever else might
 * be holding one. That includes the caller's own token, so we immediately mint a
 * fresh session from the new password to keep them signed in here.
 */
export async function changePassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await auth();
  if (!session?.user?.id) return { message: "You've been signed out. Sign in and try again." };

  // Per-user throttle: this endpoint accepts the current password, so it is a
  // brute-force target for anyone who gets hold of a session.
  const limited = await checkAuthRateLimit("change-password", {
    limit: 5,
    windowMs: 15 * 60 * 1000,
    scope: session.user.id,
  });
  if (limited) return { message: limited };

  const parsed = ChangePasswordFormSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { message: "You've been signed out. Sign in and try again." };

  if (!(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    return { errors: { currentPassword: ["That isn't your current password."] } };
  }
  if (await bcrypt.compare(parsed.data.password, user.passwordHash)) {
    return { errors: { password: ["That's already your password. Pick a different one."] } };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, passwordChangedAt: new Date() },
  });

  try {
    // Fresh token, stamped with the new passwordChangedAt. Every OTHER session is
    // now revoked on its next request; this one survives.
    await signIn("credentials", {
      email: user.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (e) {
    // A redirect thrown by signIn must propagate, never be swallowed as an error.
    if (e instanceof Error && String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    // The password change itself already committed. Worst case this session is
    // revoked on the next request and they sign in again with the new password.
    console.error("re-signin after password change failed:", e);
  }

  return { message: "ok" };
}
