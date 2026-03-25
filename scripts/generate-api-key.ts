// scripts/generate-api-key.ts
// Creer la clée : npx ts-node scripts/generate-api-key.ts "Mon label"

import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const label = process.argv[2] || "Clé sans label";

  // Génère une clé de 32 octets → 64 chars hex, préfixée "kz_"
  const key = "kz_" + crypto.randomBytes(32).toString("hex");

  const created = await prisma.api_keys.create({
    data: { key, label },
  });

  console.log("\n✅ Clé API créée avec succès !\n");
  console.log(`  Label    : ${created.label}`);
  console.log(`  Clé      : ${created.key}`);
  console.log(`  ID       : ${created.id}`);
  console.log(`\n  URL exemple :`);
  console.log(`  GET /api/teams?api_key=${created.key}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
