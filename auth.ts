import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { LoginFormSchema } from "@/lib/definitions";
import { prisma } from "@/lib/prisma";

// A throwaway bcrypt hash compared against when no user matches, so an unknown
// email costs the same time as a wrong password — closes the timing side channel
// that would otherwise let an attacker enumerate registered emails.
const DUMMY_HASH = "$2b$10$3Mbw8kisf1Bt6SoOh8pKbe0fhQsom/grnLxNyCK6yaGkAnO6uzCEW";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = LoginFormSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });

        // Always run a compare (against a dummy hash when the user is missing)
        // so response time doesn't reveal whether the email exists.
        const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !ok) return null;

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
