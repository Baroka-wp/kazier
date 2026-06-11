/**
 * Re-export du singleton Prisma pour découpler lib/core du chemin lib/prisma.
 * Permet à lib/core d'avoir une seule importation interne et de pouvoir être
 * extrait en paquet npm plus tard si besoin.
 */
export { prisma } from "../prisma";
export type { Prisma } from "@prisma/client";
