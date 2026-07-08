"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { auth, signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { issueToken, consumeToken } from "@/lib/tokens";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";
import { checkAuthRateLimit } from "@/lib/ratelimit";
import {
  SignupFormSchema,
  ForgotFormSchema,
  ResetFormSchema,
  type FormState,
} from "@/lib/definitions";

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  // Throttle account creation per IP to blunt automated signup / email-abuse.
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

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { message: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, passwordHash } });

  // Email starts unverified; send the confirmation link but don't block signup if
  // the email provider hiccups — they can resend later. The paid action is gated
  // on emailVerified, so an unverified account can't spend anything.
  try {
    const token = await issueToken(user.id, "verify_email");
    await sendVerificationEmail(email, token);
  } catch (e) {
    console.error("verification email failed:", e);
  }

  // Throws a redirect (to /dashboard) on success — must propagate, not be caught.
  await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  return undefined;
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
