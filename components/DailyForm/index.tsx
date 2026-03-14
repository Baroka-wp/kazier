"use client";

import { useState } from "react";
import {
  sendToSlack,
  checkAlreadySubmitted,
  searchNames,
  getProjectsByMember,
  getTasksByMember,
} from "@/lib/actions";

import WelcomeScreen from "./WelcomeScreen";
import FormScreen from "./FormScreen";
import ReviewScreen from "./ReviewScreen";
import SuccessScreen from "./SuccessScreen";
import { QUESTIONS_GLOBAL } from "./questions";

type Suggestion = { id: number; full_name: string };
type Citation = { quote: string; author: string };

export type Project = {
  id: number;
  name: string;
  description: string;
  icon: string;
};

export default function DailyForm() {
  const [step, setStep] = useState(-1); // -1 = welcome
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [fading, setFading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [editingFromReview, setEditingFromReview] = useState(false);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [blockReason, setBlockReason] = useState<"not_found" | "already_submitted" | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [citations, setCitations] = useState<Citation[]>([]);

  // ── Projets & tâches ───────────────────────────────────────────────────────
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Awaited<ReturnType<typeof getTasksByMember>>>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);

  async function loadProjects(team_id: number) {
    const [projectsResult, tasksResult] = await Promise.all([
      getProjectsByMember(team_id),
      getTasksByMember(team_id),
    ]);
    setProjects(projectsResult);
    setTasks(tasksResult);
  }

  function handleProjectToggle(project: Project) {
    setSelectedProjects((prev) => {
      const exists = prev.find((p) => p.id === project.id);
      if (exists) {
        // Désélectionner aussi les tâches de ce projet
        const projectTaskIds = tasks
          .filter((t) => t.project_id === project.id)
          .map((t) => t.id);
        setSelectedTaskIds((ids) => ids.filter((id) => !projectTaskIds.includes(id)));
        return prev.filter((p) => p.id !== project.id);
      }
      return [...prev, project];
    });
  }

  function handleTaskToggle(taskId: number) {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  }

  async function go(next: number) {
    // Validation étape nom
    if (step === 0) {
      if (!teamId) {
        setBlockReason("not_found");
        return;
      }
      const alreadySubmitted = await checkAlreadySubmitted(teamId);
      if (alreadySubmitted) {
        setBlockReason("already_submitted");
        setTimeout(() => {
          setBlockReason(null);
          setAnswers({});
          setTeamId(null);
          setStep(-1);
        }, 3000);
        return;
      }
    }

    // Validation étape projets
    if (step === 1) {
      if (selectedProjects.length === 0) {
        setBlockReason("not_found");
        return;
      }
    }

    setBlockReason(null);
    setFading(true);

    if (editingFromReview) {
      setTimeout(() => {
        setReviewing(true);
        setEditingFromReview(false);
        setFading(false);
      }, 180);
      return;
    }

    // Retour depuis step 0 → welcome
    if (next < 0) {
      setTimeout(() => {
        setStep(-1);
        setFading(false);
      }, 180);
      return;
    }

    setTimeout(() => {
      setStep(next);
      setFading(false);
    }, 180);
  }

  async function handleAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setBlockReason(null);
    if (id === "full_name") {
      setLoadingSearch(true);
      const results = await searchNames(value);
      setSuggestions(results);
      setLoadingSearch(false);
    }
  }

  function handleSuggestionPick(suggestion: Suggestion) {
    setTeamId(suggestion.id);
    setAnswers((prev) => ({ ...prev, full_name: suggestion.full_name }));
    setSuggestions([]);
    setBlockReason(null);
    loadProjects(suggestion.id);
  }

  // isValid selon l'étape courante
  function isValid(): boolean {
    const q = QUESTIONS_GLOBAL[step];
    if (!q) return false;
    if (q.type === "projects") return selectedProjects.length > 0;
    if (q.type === "tasks") return true; // optionnel : pas obligé de sélectionner
    const val = answers[q.id] || "";
    return val.replace(/<[^>]*>/g, "").trim().length > 0;
  }

  async function handleSubmit() {
    if (!teamId) return;
    const result = await sendToSlack({
      team_id: teamId,
      full_name: answers["full_name"],
      projects: selectedProjects.map((p) => p.name),
      validated_tasks: selectedTaskIds,
      challenges: answers["challenges"] || "",
      needed_learning: answers["needed_learning"] || "",
      tomorrow_build: answers["tomorrow_build"] || "",
    });
    if (result.success) {
      setDone(true);
      setConfetti(true);
      setTimeout(() => setConfetti(false), 3000);
    }
  }

  // ── Routing ────────────────────────────────────────────────────────────────

  if (done)
    return (
      <SuccessScreen
        answers={answers}
        confetti={confetti}
        preloadedCitations={citations}
        onReset={() => {
          setDone(false);
          setAnswers({});
          setStep(-1);
          setTeamId(null);
          setReviewing(false);
          setCitations([]);
          setSelectedProjects([]);
          setSelectedTaskIds([]);
        }}
      />
    );

  if (step === -1)
    return <WelcomeScreen onStart={() => go(0)} />;

  if (reviewing)
    return (
      <ReviewScreen
        answers={answers}
        selectedProjects={selectedProjects}
        selectedTaskIds={selectedTaskIds}
        tasks={tasks as any}
        onEdit={(questionIndex) => {
          setReviewing(false);
          setEditingFromReview(true);
          setStep(questionIndex);
        }}
        onBack={() => setReviewing(false)}
        onSubmit={handleSubmit}
        onCitationsReady={(c) => setCitations(c)}
      />
    );

  return (
    <FormScreen
      step={step}
      answers={answers}
      fading={fading}
      blockReason={blockReason}
      suggestions={suggestions}
      isValid={isValid()}
      onGo={go}
      onAnswer={handleAnswer}
      onSuggestionPick={handleSuggestionPick}
      onReview={() => setReviewing(true)}
      loadingSearch={loadingSearch}
      projects={projects}
      selectedProjects={selectedProjects}
      onProjectToggle={handleProjectToggle}
      tasks={tasks as any}
      selectedTaskIds={selectedTaskIds}
      onTaskToggle={handleTaskToggle}
    />
  );
}
