export type Language = "fr" | "en";

export const translations = {
  fr: {
    // Header
    pageTitle: "Rapport Quotidien",
    pageSubtitle: "Partagez votre progression et vos objectifs",

    // Section 1 - Identification
    whoAreYou: "Qui êtes-vous ?",
    typeName: "Tapez votre nom...",

    // Section 2 - Projects
    selectProjects: "Sélectionnez les projets sur lesquels vous avez travaillé",
    noProjects: "Aucun projet assigné pour le moment.",

    // Section 3 - Tasks
    validatedTasks: "Tâches validées",
    noTasks: "Aucune tâche disponible pour les projets sélectionnés.",
    additionalMessage: "Message complémentaire (optionnel)",
    additionalMessagePlaceholder: "Ajoutez des détails supplémentaires...",

    // Section 4 - Challenges
    challenges: "Challenges rencontrés",
    challengesPlaceholder: "Décrivez les difficultés rencontrées...",

    // Section 5 - Learning
    learningNeeds: "Ce que vous devez apprendre",
    learningNeedsPlaceholder: "Quelles compétences ou connaissances vous manquent ?",

    // Section 6 - Tomorrow
    tomorrowGoals: "Objectifs de demain",
    tomorrowGoalsPlaceholder: "Que prévoyez-vous de réaliser demain ?",

    // Section 7 - Evaluations
    evaluateTeammates: "Évaluez vos coéquipiers",
    communication: "Communication",
    collaboration: "Collaboration",
    punctuality: "Ponctualité",
    comment: "Commentaire (optionnel)",
    commentPlaceholder: "Ajoutez un commentaire...",

    // Errors
    errorSelectName: "Veuillez sélectionner votre nom.",
    errorAlreadySubmitted: "Vous avez déjà soumis votre rapport aujourd'hui.",
    errorSelectProject: "Veuillez sélectionner au moins un projet.",
    errorSelectTaskOrMessage: "Veuillez sélectionner des tâches ou ajouter un message.",
    errorEvaluateAll: "Veuillez évaluer tous vos coéquipiers.",
    errorSubmission: "Erreur lors de la soumission. Veuillez réessayer.",

    // Submit
    submitReport: "Soumettre le rapport",
    submitting: "Envoi en cours...",

    // Success
    reportSubmitted: "Rapport soumis !",
    thankYou: "Merci",
    successMessage: "Votre rapport quotidien a été envoyé avec succès.",
  },
  en: {
    // Header
    pageTitle: "Daily Report",
    pageSubtitle: "Share your progress and goals",

    // Section 1 - Identification
    whoAreYou: "Who are you?",
    typeName: "Type your name...",

    // Section 2 - Projects
    selectProjects: "Select the projects you worked on",
    noProjects: "No projects assigned at the moment.",

    // Section 3 - Tasks
    validatedTasks: "Completed Tasks",
    noTasks: "No tasks available for selected projects.",
    additionalMessage: "Additional message (optional)",
    additionalMessagePlaceholder: "Add additional details...",

    // Section 4 - Challenges
    challenges: "Challenges Encountered",
    challengesPlaceholder: "Describe the difficulties you faced...",

    // Section 5 - Learning
    learningNeeds: "What you need to learn",
    learningNeedsPlaceholder: "What skills or knowledge are you missing?",

    // Section 6 - Tomorrow
    tomorrowGoals: "Tomorrow's Goals",
    tomorrowGoalsPlaceholder: "What do you plan to accomplish tomorrow?",

    // Section 7 - Evaluations
    evaluateTeammates: "Evaluate your teammates",
    communication: "Communication",
    collaboration: "Collaboration",
    punctuality: "Punctuality",
    comment: "Comment (optional)",
    commentPlaceholder: "Add a comment...",

    // Errors
    errorSelectName: "Please select your name.",
    errorAlreadySubmitted: "You have already submitted your report today.",
    errorSelectProject: "Please select at least one project.",
    errorSelectTaskOrMessage: "Please select tasks or add a message.",
    errorEvaluateAll: "Please evaluate all your teammates.",
    errorSubmission: "Error during submission. Please try again.",

    // Submit
    submitReport: "Submit Report",
    submitting: "Submitting...",

    // Success
    reportSubmitted: "Report Submitted!",
    thankYou: "Thank you",
    successMessage: "Your daily report has been sent successfully.",
  },
};

export function useTranslation(lang: Language) {
  return translations[lang];
}
