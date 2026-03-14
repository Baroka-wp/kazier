"use client";

import { useEffect, useState } from "react";
import { ClipboardEdit } from "lucide-react";
import { BRAND, QUESTIONS_GLOBAL } from "./questions";
import Screen from "./Screen";
import SubmitButton from "./SubmitButton";
import type { Project } from "./index";

type Task = {
  id: number;
  title: string;
  project_id: number;
  priority: string;
  status: string;
  due_date: string | null;
};

type Citation = { quote: string; author: string };

type Props = {
  answers: Record<string, string>;
  selectedProjects: Project[];
  selectedTaskIds: number[];
  tasks: Task[];
  onEdit: (questionIndex: number) => void;
  onBack: () => void;
  onSubmit: () => Promise<void>;
  onCitationsReady: (citations: Citation[]) => void;
};

const FALLBACK_CITATIONS: Citation[] = [
  { quote: "Le succès, c'est d'aller d'échec en échec sans perdre son enthousiasme.", author: "Winston Churchill" },
  { quote: "La vie, c'est comme une bicyclette, il faut avancer pour ne pas perdre l'équilibre.", author: "Albert Einstein" },
  { quote: "Le seul moyen de faire du bon travail est d'aimer ce que vous faites.", author: "Steve Jobs" },
];

const priorityColor = (p: string) =>
  p === "high" ? "#EF4444" : p === "medium" ? "#F59E0B" : "#22C55E";

const statusLabel = (s: string) =>
  s === "à faire" ? "À faire" : s === "en cours" ? "En cours" : "Terminé";

// ── Sections de review ────────────────────────────────────────────────────────

function useReviewSections(
  answers: Record<string, string>,
  selectedProjects: Project[],
  selectedTaskIds: number[],
  tasks: Task[]
) {
  const selectedTasks = tasks.filter(t => selectedTaskIds.includes(t.id));
  const tasksByProject = selectedProjects
    .map(p => ({ project: p, tasks: selectedTasks.filter(t => t.project_id === p.id) }))
    .filter(g => g.tasks.length > 0);

  return [
    {
      id: "full_name",
      short: "Nom",
      questionIndex: 0,
      isEmpty: !answers["full_name"],
      content: (
        <p style={{ fontSize: "1rem", fontWeight: 600, color: "#1A1A1A" }}>{answers["full_name"]}</p>
      ),
    },
    {
      id: "projects",
      short: "Projets",
      questionIndex: 1,
      isEmpty: selectedProjects.length === 0,
      content: (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {selectedProjects.map(p => (
            <span key={p.id} style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              padding: "5px 12px", borderRadius: "20px",
              background: `${BRAND}12`, border: `1px solid ${BRAND}25`,
              fontSize: "13px", fontWeight: 600, color: BRAND,
            }}>
              📁 {p.name}
            </span>
          ))}
        </div>
      ),
    },
    {
      id: "validated_tasks",
      short: "Tâches validées",
      questionIndex: 2,
      isEmpty: selectedTasks.length === 0,
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {tasksByProject.length > 0 ? tasksByProject.map(({ project, tasks: ptasks }) => (
            <div key={project.id}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: BRAND, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                📁 {project.name}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                {ptasks.map(task => (
                  <div key={task.id} style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "7px 10px", borderRadius: "10px",
                    background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.05)",
                  }}>
                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: priorityColor(task.priority), flexShrink: 0 }} />
                    <span style={{ fontSize: "12px", fontWeight: 500, color: "#1A1A1A", flex: 1 }}>{task.title}</span>
                    <span style={{ fontSize: "10px", fontWeight: 600, color: "#666", background: "rgba(0,0,0,0.05)", padding: "2px 8px", borderRadius: "20px", whiteSpace: "nowrap" }}>
                      {statusLabel(task.status)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )) : (
            <p style={{ fontSize: "0.83rem", color: "#bbb", fontStyle: "italic" }}>Aucune tâche sélectionnée</p>
          )}
        </div>
      ),
    },
    {
      id: "challenges",
      short: "Challenges",
      questionIndex: 3,
      isEmpty: !answers["challenges"]?.replace(/<[^>]*>/g, "").trim(),
      content: (
        <div className="prose prose-sm max-w-none" style={{ fontSize: "0.85rem", color: "#1A1A1A", lineHeight: 1.7 }}
          dangerouslySetInnerHTML={{ __html: answers["challenges"] || "" }} />
      ),
    },
    {
      id: "needed_learning",
      short: "À apprendre",
      questionIndex: 4,
      isEmpty: !answers["needed_learning"]?.replace(/<[^>]*>/g, "").trim(),
      content: (
        <div className="prose prose-sm max-w-none" style={{ fontSize: "0.85rem", color: "#1A1A1A", lineHeight: 1.7 }}
          dangerouslySetInnerHTML={{ __html: answers["needed_learning"] || "" }} />
      ),
    },
    {
      id: "tomorrow_build",
      short: "Demain",
      questionIndex: 5,
      isEmpty: !answers["tomorrow_build"]?.replace(/<[^>]*>/g, "").trim(),
      content: (
        <div className="prose prose-sm max-w-none" style={{ fontSize: "0.85rem", color: "#1A1A1A", lineHeight: 1.7 }}
          dangerouslySetInnerHTML={{ __html: answers["tomorrow_build"] || "" }} />
      ),
    },
  ];
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function ReviewScreen({
  answers, selectedProjects, selectedTaskIds, tasks,
  onEdit, onBack, onSubmit, onCitationsReady,
}: Props) {
  const [activeCard, setActiveCard] = useState(0);
  const [fading, setFading] = useState(false);

  const sections = useReviewSections(answers, selectedProjects, selectedTaskIds, tasks);
  const section = sections[activeCard];
  const total = sections.length;

  useEffect(() => {
    fetch("/api/citation")
      .then(r => r.json())
      .then(data => onCitationsReady(data))
      .catch(() => onCitationsReady(FALLBACK_CITATIONS));
  }, []);

  function navigate(dir: number) {
    const next = activeCard + dir;
    if (next < 0 || next >= total) return;
    setFading(true);
    setTimeout(() => {
      setActiveCard(next);
      setFading(false);
    }, 150);
  }

  return (
    <Screen>
      <div className="w-full max-w-xl mx-auto" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6" style={{ flexShrink: 0 }}>
          <img src="/africa-samurai-logo.png" alt="Africa Samurai" className="h-12" />
          <span className="text-xs text-[#666666] capitalize">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>

        <h2 className="text-2xl font-bold text-[#1A1A1A] mb-1" style={{ flexShrink: 0 }}>Vérifiez votre rapport</h2>
        <p className="text-sm text-[#666666] mb-5" style={{ flexShrink: 0 }}>Tout est correct ? Modifiez avant d&apos;envoyer.</p>

        {/* Pastilles de navigation */}
        <div className="flex gap-1.5 mb-5" style={{ flexShrink: 0 }}>
          {sections.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { setFading(true); setTimeout(() => { setActiveCard(i); setFading(false); }, 150); }}
              title={s.short}
              style={{
                height: "6px", borderRadius: "3px", border: "none",
                background: i === activeCard ? BRAND : s.isEmpty ? "rgba(0,0,0,0.08)" : `${BRAND}30`,
                width: i === activeCard ? "32px" : "8px",
                cursor: "pointer", padding: 0,
                transition: "all 0.25s",
              }}
            />
          ))}
        </div>

        {/* Card unique — scrollable si contenu long */}
        <div
          style={{
            flex: 1, overflow: "hidden",
            borderRadius: "20px", border: "1px solid rgba(0,0,0,0.07)",
            display: "flex", flexDirection: "column",
            opacity: fading ? 0 : 1,
            transform: fading ? "translateX(8px)" : "translateX(0)",
            transition: "opacity 0.15s, transform 0.15s",
          }}
        >
          {/* Header de la card */}
          <div style={{
            padding: "14px 18px",
            background: `${BRAND}08`,
            borderBottom: `1px solid ${BRAND}15`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: BRAND, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                {section.short}
              </span>
              {section.isEmpty && (
                <span style={{ fontSize: "10px", color: "#F59E0B", fontWeight: 600, background: "rgba(245,158,11,0.1)", padding: "2px 8px", borderRadius: "10px" }}>
                  Non renseigné
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => onEdit(section.questionIndex)}
              title="Modifier"
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "5px", borderRadius: "8px",
                color: "#999", display: "flex", alignItems: "center",
                transition: "color 0.15s, background 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = BRAND; e.currentTarget.style.background = `${BRAND}12`; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#999"; e.currentTarget.style.background = "none"; }}
            >
              <ClipboardEdit size={16} />
            </button>
          </div>

          {/* Contenu scrollable */}
          <div style={{ flex: 1, overflowY: "auto", padding: "18px", background: "#F5F2ED" }}>
            {section.isEmpty
              ? <p style={{ fontSize: "0.85rem", color: "#bbb", fontStyle: "italic" }}>Non renseigné</p>
              : section.content
            }
          </div>

          {/* Navigation ← → dans la card */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 16px",
            borderTop: "1px solid rgba(0,0,0,0.05)",
            background: "#fff",
            flexShrink: 0,
          }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={activeCard === 0}
              style={{
                padding: "5px 14px", borderRadius: "10px",
                border: "1.5px solid rgba(0,0,0,0.08)",
                background: activeCard === 0 ? "transparent" : "#F5F2ED",
                color: activeCard === 0 ? "#ddd" : "#666",
                fontSize: "12px", fontWeight: 600,
                cursor: activeCard === 0 ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >← Préc.</button>

            <span style={{ fontSize: "11px", color: "#bbb" }}>{activeCard + 1} / {total}</span>

            <button
              type="button"
              onClick={() => navigate(1)}
              disabled={activeCard === total - 1}
              style={{
                padding: "5px 14px", borderRadius: "10px",
                border: "1.5px solid rgba(0,0,0,0.08)",
                background: activeCard === total - 1 ? "transparent" : "#F5F2ED",
                color: activeCard === total - 1 ? "#ddd" : "#666",
                fontSize: "12px", fontWeight: 600,
                cursor: activeCard === total - 1 ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >Suiv. →</button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-4" style={{ flexShrink: 0 }}>
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 rounded-2xl font-semibold cursor-pointer transition-all bg-black/[0.04] text-[#666666] border border-black/7 hover:bg-black/[0.07] hover:text-[#1A1A1A]"
          >←</button>
          <SubmitButton disabled={false} onClick={onSubmit} />
        </div>
      </div>
    </Screen>
  );
}
