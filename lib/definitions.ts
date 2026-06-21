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

export type FormState =
  | {
      errors?: { name?: string[]; email?: string[]; password?: string[] };
      message?: string;
    }
  | undefined;
