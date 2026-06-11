/**
 * Bus d'événements interne — découplé des effets de bord (Slack, mail, etc.).
 *
 * Les fonctions core émettent un event après mutation réussie. Les listeners
 * (notifier Slack, mailer, MCP push…) s'abonnent dans la couche serveur
 * (lib/server/integrations/) — pas dans lib/core.
 *
 * Avantages :
 *   - lib/core reste pur (zéro fetch externe)
 *   - on peut désactiver/remplacer les notifications sans toucher au métier
 *   - tests faciles : on espionne l'emitter au lieu de mocker Slack
 */

import { EventEmitter } from "node:events";

// ── Types d'événements ────────────────────────────────────────────────────

export type DomainEventMap = {
  "project.created": { projectId: string; actorId: string | null };
  "project.member_added": { projectId: string; memberId: string; actorId: string | null };
  "project.member_removed": { projectId: string; memberId: string; actorId: string | null };

  "task.created": { taskId: string; projectId: string | null; actorId: string | null };
  "task.assigned": { taskId: string; memberIds: string[]; actorId: string | null };
  "task.status_changed": {
    taskId: string;
    from: string;
    to: string;
    actorId: string | null;
  };

  "deliverable.created": { deliverableId: string; projectId: string; actorId: string | null };
  "deliverable.status_changed": {
    deliverableId: string;
    from: string;
    to: string;
    actorId: string | null;
  };

  "report.submitted": { reportId: string; memberId: string; projectId: string | null };

  "expense.added": { expenseId: string; projectId: string; actorId: string | null };
  "expense.budget_threshold": { projectId: string; ratio: number };

  "note.created": { noteId: string; projectId: string; actorId: string | null };
};

export type DomainEventName = keyof DomainEventMap;

// ── Singleton emitter ─────────────────────────────────────────────────────

class TypedEmitter {
  private e = new EventEmitter();
  emit<K extends DomainEventName>(name: K, payload: DomainEventMap[K]) {
    this.e.emit(name, payload);
  }
  on<K extends DomainEventName>(name: K, fn: (payload: DomainEventMap[K]) => void) {
    this.e.on(name, fn);
  }
  off<K extends DomainEventName>(name: K, fn: (payload: DomainEventMap[K]) => void) {
    this.e.off(name, fn);
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __kazierEvents: TypedEmitter | undefined;
}

export const events: TypedEmitter = globalThis.__kazierEvents ?? new TypedEmitter();
if (process.env.NODE_ENV !== "production") globalThis.__kazierEvents = events;
