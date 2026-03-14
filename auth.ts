import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email:    { label: "Email",        type: "email"    },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        // Récupérer l'utilisateur avec son équipe
        const user = await prisma.users.findFirst({
          where: {
            email: {
              equals: (credentials.email as string).trim(),
              mode: 'insensitive',
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

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!isValid) return null;

        const fullName = `${user.team?.first_name ?? ""} ${user.team?.last_name ?? ""}`.trim();

        return {
          id:         String(user.id), // ✅ ID en string
          email:      user.email,
          name:       fullName || user.email,
          role:       user.role,
          team_id:    user.team_id,
          first_name: user.team?.first_name,
          last_name:  user.team?.last_name,
        };
      },
    }),
  ],
  callbacks: {
    // Stocker toutes les infos dans le JWT
    async jwt({ token, user }) {
      if (user) {
        token.id        = (user as any).id;        // ✅ Ajouter l'ID
        token.role      = (user as any).role;
        token.team_id   = (user as any).team_id;
        token.first_name = (user as any).first_name;
        token.last_name = (user as any).last_name;
        token.name      = user.name;
      }
      return token;
    },
    // Exposer toutes les infos dans la session
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id        = token.id;         // ✅ Ajouter l'ID
        (session.user as any).role      = token.role;
        (session.user as any).team_id   = token.team_id;
        (session.user as any).first_name = token.first_name;
        (session.user as any).last_name = token.last_name;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});