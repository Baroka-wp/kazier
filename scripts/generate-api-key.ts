// scripts/generate-api-key.ts
//
// Génère une clé API V2 (table ApiKey, stockée hashée). Affiche la clé en
// clair UNE SEULE FOIS — à copier immédiatement.
//
// Usage : npx tsx scripts/generate-api-key.ts "Mon label" "scope1,scope2"
//
// Exemples de scopes : "projects:read", "tasks:write", "reports:read",
//                       "expenses:read", "*" (tout — à utiliser avec parcimonie)

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const label = process.argv[2] || "Clé sans label";
  const scopesArg = process.argv[3] || "projects:read,tasks:read,reports:read";
  const scopes = scopesArg
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const key = "kz_" + crypto.randomBytes(32).toString("hex");
  const prefix = key.slice(0, 8);
  const keyHash = await bcrypt.hash(key, 10);

  const created = await prisma.apiKey.create({
    data: { keyHash, prefix, label, scopes },
  });

  console.log("\n✅ Clé API créée avec succès !\n");
  console.log(`  Label    : ${created.label}`);
  console.log(`  Préfixe  : ${created.prefix}`);
  console.log(`  Scopes   : ${created.scopes.join(", ")}`);
  console.log(`  ID       : ${created.id}\n`);
  console.log(`  Clé en clair (À COPIER MAINTENANT — non récupérable) :\n`);
  console.log(`  ${key}\n`);
  console.log(`  La clé est stockée hashée (bcrypt) en DB.`);
  console.log(`  Si tu la perds, il faut en générer une nouvelle.\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
