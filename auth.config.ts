import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config. Contains NO bcrypt/Prisma imports so it can run in
 * the proxy (Next 16's renamed middleware). The Credentials provider with its
 * Node-only `authorize` lives in auth.ts instead.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const onDashboard = nextUrl.pathname.startsWith("/dashboard");
      const onAuthPage =
        nextUrl.pathname === "/login" || nextUrl.pathname === "/signup";

      if (onDashboard) return isLoggedIn; // unauthenticated → redirect to signIn page
      if (isLoggedIn && onAuthPage)
        return Response.redirect(new URL("/dashboard", nextUrl));
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;

export default authConfig;
