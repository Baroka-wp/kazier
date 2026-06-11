/**
 * Point d'entrée des intégrations serveur. Import une seule fois côté serveur
 * pour activer les listeners (Slack, mail, etc.).
 *
 * Utilisation : `import "@/lib/server/integrations";` dans auth.ts.
 */

import "./slack/notifier";
