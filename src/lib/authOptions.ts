import "server-only";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { env } from "@/config/env";
import { rateLimit } from "@/lib/rateLimit";

const secureCookies = !env.isDev;

export const authOptions: NextAuthOptions = {
  debug: env.isDev,
  secret: env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
    updateAge: 60 * 60,
  },
  jwt: {
    maxAge: 60 * 60 * 24 * 7,
  },
  useSecureCookies: secureCookies,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.trim().toLowerCase();
        const headers = req?.headers as
          | undefined
          | Headers
          | Record<string, string | string[] | undefined>;
        const getHeader = (name: string) => {
          if (!headers) return undefined;
          if (typeof (headers as Headers).get === "function") {
            return (headers as Headers).get(name) ?? undefined;
          }
          const key = name.toLowerCase();
          const value = (headers as Record<string, string | string[] | undefined>)[name] ??
            (headers as Record<string, string | string[] | undefined>)[key];
          if (Array.isArray(value)) return value[0];
          return value;
        };
        const forwarded = getHeader("x-forwarded-for");
        const ip = forwarded ? forwarded.split(",")[0]?.trim() : getHeader("x-real-ip") ?? "unknown";
        const limiter = rateLimit(`auth:${ip}:${email}`, { limit: 20, windowMs: 60_000 });
        if (!limiter.allowed) {
          throw new Error("Too many attempts. Try again later.");
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { updatedAt: new Date() },
          });
        } catch {
          // Ignore last-seen update failures to avoid blocking sign-in.
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.organizationId = (user as any).organizationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).organizationId = token.organizationId;
      }
      return session;
    },
  },
  cookies: {
    sessionToken: {
      name: secureCookies ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        secure: secureCookies,
      },
    },
  },
  pages: {
    signIn: "/signin",
  },
};
