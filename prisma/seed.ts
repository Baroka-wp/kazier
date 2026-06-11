// prisma/seed.ts
//
// Crée un compte SUPER_ADMIN initial. Utilisé seulement pour une DB neuve.
// Sur une DB existante, no-op si l'admin existe déjà.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  try {
    const email = "birotori@gmail.com";
    const password = await bcrypt.hash("motdepasse123", 10);

    const existing = await prisma.auth.findUnique({ where: { email } });
    if (existing) {
      console.log("⚠️  Compte admin déjà présent — seed ignoré.");
      return;
    }

    const member = await prisma.member.create({
      data: {
        firstName: "Djoni",
        lastName: "OUEDANOU",
        email,
        isBoss: true,
        role: "SUPER_ADMIN",
      },
    });

    await prisma.auth.create({
      data: {
        memberId: member.id,
        email,
        passwordHash: password,
      },
    });

    console.log("✅ Admin créé !");
    console.log(`   Email     : ${email}`);
    console.log(`   Mot de passe : motdepasse123 (à changer immédiatement)`);
    console.log(`   Member ID : ${member.id}`);
  } catch (error) {
    console.error("❌ Erreur lors du seed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
