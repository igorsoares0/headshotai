import * as z from "zod";

export const SignupFormSchema = z.object({
  name: z.string().min(2, { error: "Name must be at least 2 characters." }).trim(),
  // Lowercase so the unique constraint + login lookup are case-insensitive
  // ("User@x.com" and "user@x.com" must resolve to the same account).
  email: z.email({ error: "Please enter a valid email." }).trim().toLowerCase(),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters." })
    .trim(),
});

export const LoginFormSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }).trim().toLowerCase(),
  password: z.string().min(1, { error: "Password is required." }),
});

export const ForgotFormSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }).trim().toLowerCase(),
});

export const ResetFormSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters." })
    .trim(),
});

// Changing a password while signed in — unlike the reset flow, this one has to
// prove you know the current password, since a hijacked session must not be
// enough to lock the real owner out.
export const ChangePasswordFormSchema = z.object({
  currentPassword: z.string().min(1, { error: "Enter your current password." }),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters." })
    .trim(),
});

export type FormState =
  | {
      errors?: {
        name?: string[];
        email?: string[];
        password?: string[];
        currentPassword?: string[];
      };
      message?: string;
    }
  | undefined;
