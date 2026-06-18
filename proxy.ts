import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Next 16 renamed Middleware to Proxy. This runs the edge-safe authConfig's
// `authorized` callback on every matched route to gate /dashboard and bounce
// logged-in users away from /login and /signup.
export default NextAuth(authConfig).auth;

export const config = {
  // Skip API routes, Next internals, and static assets (incl. generated images).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|generated|.*\\.png$).*)"],
};
