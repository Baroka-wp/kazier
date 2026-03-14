// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  try {
    const password = await bcrypt.hash("motdepasse123", 10);
    const email = "birotori@gmail.com";

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.users.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log("⚠️  L'utilisateur existe déjà !");
      return;
    }

    // Créer d'abord l'entrée dans teams
    const team = await prisma.teams.create({
      data: {
        first_name: "Irotori",
        last_name: "BAROKA",
        is_boss: true,
        email: email,
      }
    });

    // Créer ensuite l'utilisateur avec le team_id
    await prisma.users.create({
      data: {
        email: email,
        password: password,
        role: "SA",
        team_id: team.id
      }
    });

    console.log("✅ Admin créé avec succès !");
    console.log(`   Email: ${email}`);
    console.log(`   Mot de passe: motdepasse123`);
    console.log(`   Team ID: ${team.id}`);

  } catch (error) {
    console.error("❌ Erreur lors de la création de l'admin:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
