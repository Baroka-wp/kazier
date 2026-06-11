/**
 * Audit log — chaque mutation traversant lib/core écrit ici.
 *
 * C'est la "mémoire pilotable par IA" : Claude pourra interroger l'historique
 * (`audit.timeline(projectId)`) pour répondre à des questions comme
 * "qu'est-ce qu'on a changé sur ce projet la semaine dernière ?".
 *
 * Convention :
 *   - action = "<entity>.<verb>"  ex: "project.create", "task.update_status"
 *   - entity = nom de l'entité racine ("project", "task", "report"…)
 *   - entityId = id de la ressource concernée
 *   - diff = JSON libre, idéalement { before?, after?, changes?: string[] }
 *
 * Ne throw jamais — un échec d'audit ne doit pas casser une mutation métier.
 */

import { prisma } from "./prisma";
import type { Actor } from "./actor";
import { actorMemberId } from "./actor";

export type AuditPayload = {
  actor: Actor;
  action: string;
  entity: string;
  entityId: string;
  diff?: unknown;
};

export async function logAction(p: AuditPayload): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actorMemberId(p.actor),
        actorType: p.actor.type,
        action: p.action,
        entity: p.entity,
        entityId: p.entityId,
        diff: p.diff as never,
      },
    });
  } catch (e) {
    console.error("[audit.logAction] failed:", e);
  }
}

/**
 * Récupère la timeline d'une entité — utilisé par `audit.timeline` côté MCP/UI.
 */
export async function entityTimeline(entity: string, entityId: string, limit = 50) {
  return prisma.auditLog.findMany({
    where: { entity, entityId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      actor: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}
