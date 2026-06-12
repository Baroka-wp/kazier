import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./lib/prisma";
import bcrypt from "bcryptjs";

// Note: les listeners Slack/intégrations sont chargés via lib/server/with-auth
// (côté Node, jamais Edge) pour ne pas casser le middleware Edge Runtime.

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  cookies: {
    sessionToken: {
      name: "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production" && process.env.AUTH_URL?.startsWith("https"),
      },
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials.email as string).trim().toLowerCase();
        const password = credentials.password as string;

        const auth = await prisma.auth.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
          include: {
            member: {
              select: { id: true, firstName: true, lastName: true, role: true, isActive: true },
            },
          },
        });

        if (!auth || !auth.member.isActive) return null;
        const valid = await bcrypt.compare(password, auth.passwordHash);
        if (!valid) return null;

        const fullName = `${auth.member.firstName} ${auth.member.lastName}`.trim();

        return {
          id: auth.member.id,             // cuid Member
          email: auth.email,
          name: fullName,
          role: auth.member.role,
          first_name: auth.member.firstName,
          last_name: auth.member.lastName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as {
          id?: string;
          role?: string;
          first_name?: string;
          last_name?: string;
          name?: string;
        };
        token.id = u.id;
        token.role = u.role;
        token.first_name = u.first_name;
        token.last_name = u.last_name;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        type ExtendedUser = {
          id?: string;
          role?: string;
          first_name?: string;
          last_name?: string;
        };
        (session.user as ExtendedUser).id = token.id as string;
        (session.user as ExtendedUser).role = token.role as string;
        (session.user as ExtendedUser).first_name = token.first_name as string;
        (session.user as ExtendedUser).last_name = token.last_name as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
