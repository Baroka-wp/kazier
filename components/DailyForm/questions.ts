export const BRAND = "#6B1A2A";

// Toutes les questions posées une seule fois — plus de répétition par projet
export const QUESTIONS_GLOBAL = [
  { id: "full_name",       short: "Nom",         label: "Qui êtes-vous ?",                                     type: "input"    },
  { id: "projects",        short: "Projets",     label: "Sur quel(s) projet(s) avez-vous travaillé ?",         type: "projects" },
  { id: "validated_tasks", short: "Tâches",      label: "Quelles sont les tâches validées ?",                  type: "tasks"    },
  { id: "challenges",      short: "Challenges",  label: "Quels challenges avez-vous rencontrés ?",                  type: "textarea" },
  { id: "needed_learning", short: "À apprendre", label: "Que devez-vous apprendre pour avancer ?",             type: "textarea" },
  { id: "tomorrow_build",  short: "Demain",      label: "Quels sont vos objectis de demain ?",                   type: "textarea" },
];

// QUESTIONS_PROJECT n'est plus utilisé — conservé pour compatibilité éventuelle
export const QUESTIONS_PROJECT: never[] = [];
