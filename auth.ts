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

        // pwc = the password-change stamp this session is minted against; the jwt
        // callback later revokes the token if the DB value moves past it.
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          pwc: user.passwordChangedAt?.getTime() ?? 0,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        // initial sign-in: stamp the id + the password-change marker
        token.sub = user.id;
        token.pwc = (user as { pwc?: number }).pwc ?? 0;
        return token;
      }
      // subsequent requests: revoke the session if the account was deleted or its
      // password changed after this token was issued (e.g. a reset elsewhere).
      // Runs only in the Node auth() instance — the edge proxy uses authConfig,
      // which has no DB access, so page-gating stays fast and data access re-checks.
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { passwordChangedAt: true },
        });
        if (!dbUser) return null; // account gone → invalidate
        const changedAt = dbUser.passwordChangedAt?.getTime() ?? 0;
        if (changedAt > ((token.pwc as number | undefined) ?? 0)) return null; // password rotated
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
