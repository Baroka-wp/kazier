import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        // Récupérer l'utilisateur avec son équipe
        const user = await prisma.users.findFirst({
          where: {
            email: {
              equals: (credentials.email as string).trim(),
              mode: "insensitive",
            },
          },
          include: {
            team: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password as string, user.password);
        if (!isValid) return null;

        const fullName = `${user.team?.first_name ?? ""} ${user.team?.last_name ?? ""}`.trim();

        return {
          id: String(user.id), // ✅ ID en string
          email: user.email,
          name: fullName || user.email,
          role: user.role,
          team_id: user.team_id,
          first_name: user.team?.first_name,
          last_name: user.team?.last_name,
        };
      },
    }),
  ],
  callbacks: {
    // Stocker toutes les infos dans le JWT
    async jwt({ token, user }) {
      if (user) {
        const customUser = user as {
          id?: string;
          role?: string;
          team_id?: number;
          first_name?: string;
          last_name?: string;
          name?: string;
        };
        token.id = customUser.id; // ✅ Ajouter l'ID
        token.role = customUser.role;
        token.team_id = customUser.team_id;
        token.first_name = customUser.first_name;
        token.last_name = customUser.last_name;
        token.name = user.name;
      }
      return token;
    },
    // Exposer toutes les infos dans la session
    async session({ session, token }) {
      if (session.user) {
        type ExtendedUser = {
          id?: string;
          role?: string;
          team_id?: number;
          first_name?: string;
          last_name?: string;
        };
        (session.user as ExtendedUser).id = token.id as string; // ✅ Ajouter l'ID
        (session.user as ExtendedUser).role = token.role as string;
        (session.user as ExtendedUser).team_id = token.team_id as number;
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
  // Configuration pour éviter les problèmes d'IP locale
  trustHost: true,
});
