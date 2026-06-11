/**
 * Surface publique de lib/core.
 *
 * Importer ainsi côté consommateur :
 *   import { Result, ok, err, validate, ERR, requirePerm } from "@/lib/core";
 *   import { CreateProjectInput } from "@/lib/core/schemas/project";
 *
 * Les fonctions métier (projects.create, tasks.assign…) seront ajoutées
 * dans les sous-phases suivantes (2.B et au-delà).
 */

export * from "./result";
export * from "./errors";
export * from "./actor";
export * from "./validate";
export * from "./permissions";
export { logAction, entityTimeline } from "./audit";
export { events } from "./events";
export type { DomainEventMap, DomainEventName } from "./events";
export { prisma } from "./prisma";

// ── Namespaces métier ────────────────────────────────────────────────────
import * as members from "./members";
import * as projects from "./projects";
export { members, projects };
