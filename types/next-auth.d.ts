import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    // epoch-ms password-change marker the token was minted with; compared in the
    // jwt callback to revoke sessions issued before a password reset.
    pwc?: number;
  }
}
