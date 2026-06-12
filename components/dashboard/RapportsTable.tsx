"use client";

import { useState, useMemo } from "react";
import { FileDown, X, ChevronDown, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Folder } from "lucide-react";
import { useSWRConfig } from "swr";
import DataTable from "@/components/dashboard/DataTable";
import { deleteReport, updateReport } from "@/lib/report-actions";
import { usePermissions } from "@/hooks/usePermissions";
import dynamic from "next/dynamic";

const RichTextArea = dynamic(() => import("@/components/DailyForm/RichTextArea"), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────────

type Report = {
  id: string;
  full_name: string;
  role: string;
  built: string;
  working_built: string;
  blocked: string;
  validated_learning: string;
  needed_learning: string;
  tomorrow_build: string;
  extra_message: string;
  submitted_at: string;
  project_id: number | null;
  project_name: string;
  project_icon?: string;
};

// Groupe : une ligne par utilisateur par jour
type ReportGroup = {
  id: string; // ← requis par DataTable (= même valeur que key)
  key: string;
  full_name: string;
  role: string;
  submitted_at: string;
  reports: Report[]; // un par projet
};

type Props = {
  reports: Report[];
  roles: string[];
  projects: Array<{ id: string; name: string }>;
  loading?: boolean;
  isEmpty?: boolean;
  // Pagination serveur
  onPageChange?: (page: number) => void;
  onSearch?: (search: string) => void;
  totalItems?: number;
  totalPages?: number;
  currentPage?: number;
  // Filtres
  roleFilter?: string;
  onRoleFilter?: (role: string) => void;
  projectFilter?: number | undefined;
  onProjectFilter?: (projectId: number | undefined) => void;
  dateFilter?: string;
  onDateFilter?: (dateFilter: string) => void;
};

type Toast = { id: number; type: "success" | "error"; message: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function isHtmlContent(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trimStart().startsWith("<");
}

function groupReports(reports: Report[]): ReportGroup[] {
  const map = new Map<string, ReportGroup>();
  for (const r of reports) {
    const day = new Date(r.submitted_at).toISOString().split("T")[0];
    const key = `${r.full_name}__${day}`;
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        key,
        full_name: r.full_name,
        role: r.role,
        submitted_at: r.submitted_at,
        reports: [],
      });
    }
    map.get(key)!.reports.push(r);
  }
  return Array.from(map.values());
}

// ── Icône Lucide dynamique ────────────────────────────────────────────────────

function ProjectIcon({
  name,
  size = 13,
  color = "#6B1A2A",
}: {
  name?: string;
  size?: number;
  color?: string;
}) {
  if (!name) return <Folder size={size} color={color} />;
  const pascal = name
    .replace(/[-_](.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (_, c: string) => c.toUpperCase());
  type LucideIconType = React.FC<{ size?: number; color?: string }>;
  const Icon = (LucideIcons as unknown as Record<string, LucideIconType>)[pascal];
  if (!Icon) return <Folder size={size} color={color} />;
  return <Icon size={size} color={color} />;
}

// ── Badges ────────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    T: { label: "Team", bg: "rgba(16,185,129,0.1)", color: "#10b981" },
    TM: { label: "Team Manager", bg: "rgba(59,130,246,0.1)", color: "#3b82f6" },
    SA: { label: "Super Admin", bg: "rgba(107,26,42,0.1)", color: "#6B1A2A" },
  };
  const s = map[role] ?? { label: role, bg: "rgba(107,26,42,0.07)", color: "#6B1A2A" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: "20px",
        fontSize: "0.67rem",
        fontWeight: 600,
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return (
    <div
      style={{
        width: "30px",
        height: "30px",
        borderRadius: "50%",
        background: "rgba(107,26,42,0.07)",
        border: "1.5px solid rgba(107,26,42,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.65rem",
        fontWeight: 700,
        color: "#6B1A2A",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

// ── Styles contenu riche ──────────────────────────────────────────────────────

const RICH_CONTENT_STYLES = `
  .report-content img        { max-width: 100%; border-radius: 8px; display: block; margin-top: 8px; }
  .report-content ul         { list-style-type: disc;    padding-left: 20px; }
  .report-content ol         { list-style-type: decimal; padding-left: 20px; }
  .report-content li         { margin-bottom: 2px; }
  .report-content h1         { font-size: 18px; font-weight: 700; color: #1A1A1A; }
  .report-content h2         { font-size: 15px; font-weight: 700; color: #1A1A1A; }
  .report-content code       { background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px; }
  .report-content pre        { background: rgba(0,0,0,0.06); padding: 12px; border-radius: 8px; overflow-x: auto; }
  .report-content pre code   { background: none; padding: 0; }
  .report-content blockquote { border-left: 3px solid #6B1A2A; padding-left: 12px; color: #666; }
  .report-content p          { margin: 0; }
  .report-content > * + *    { margin-top: 8px; }
`;

function ReportField({ value }: { value: string | null | undefined }) {
  const html = isHtmlContent(value);
  return html ? (
    <>
      <style>{RICH_CONTENT_STYLES}</style>
      <div
        className="report-content"
        style={{
          fontSize: "0.83rem",
          color: "#1A1A1A",
          background: "#e8eaed",
          borderRadius: "10px",
          padding: "10px 14px",
          lineHeight: 1.6,
        }}
        dangerouslySetInnerHTML={{ __html: value! }}
      />
    </>
  ) : (
    <div
      style={{
        fontSize: "0.83rem",
        color: value ? "#1A1A1A" : "#ccc",
        background: "#e8eaed",
        borderRadius: "10px",
        padding: "10px 14px",
        lineHeight: 1.6,
      }}
    >
      {value || "Non renseigné"}
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function ToastNotification({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const ok = toast.type === "success";
  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: "#fff",
        border: `1.5px solid ${ok ? "rgba(45,122,79,0.2)" : "rgba(229,62,62,0.2)"}`,
        borderRadius: "12px",
        padding: "12px 16px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
        minWidth: "280px",
        animation: "slideIn 0.25s ease",
      }}
    >
      {ok ? <CheckCircle2 size={18} color="#2D7A4F" /> : <XCircle size={18} color="#e53e3e" />}
      <span style={{ fontSize: "0.83rem", fontWeight: 500, color: "#1A1A1A", flex: 1 }}>
        {toast.message}
      </span>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#aaa",
          display: "flex",
          padding: "2px",
        }}
      >
        <X size={14} />
      </button>
      <style>{`@keyframes slideIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  );
}

// ── Modal suppression ─────────────────────────────────────────────────────────

function DeleteModal({
  group,
  onConfirm,
  onCancel,
  loading,
}: {
  group: ReportGroup;
  onConfirm: (reportIds: number[]) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  // Par défaut tous les projets sont sélectionnés
  const [selected, setSelected] = useState<Set<number>>(new Set(group.reports.map((r) => r.id)));

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const allSelected = selected.size === group.reports.length;
  const noneSelected = selected.size === 0;

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "420px",
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,0.15)",
          animation: "popIn 0.2s ease",
        }}
      >
        <div
          style={{
            padding: "24px 24px 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "rgba(229,62,62,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
            }}
          >
            <AlertTriangle size={22} color="#e53e3e" />
          </div>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1A1A1A", marginBottom: "8px" }}>
            Supprimer des rapports
          </h3>

          {/* Identité */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#e8eaed",
              borderRadius: "10px",
              padding: "8px 14px",
              marginBottom: "14px",
              width: "100%",
            }}
          >
            <Avatar name={group.full_name} />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "0.83rem", fontWeight: 600, color: "#1A1A1A" }}>
                {group.full_name}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#aaa" }}>
                {new Date(group.submitted_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>

          {/* Sélection rapports — seulement si plusieurs */}
          {group.reports.length > 1 ? (
            <div style={{ width: "100%", marginBottom: "12px" }}>
              <p style={{ fontSize: "0.75rem", color: "#888", marginBottom: "8px" }}>
                Sélectionnez les rapports à supprimer :
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {group.reports.map((r) => (
                  <label
                    key={r.id}
                    onClick={() => toggle(r.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      border: `1.5px solid ${selected.has(r.id) ? "rgba(229,62,62,0.3)" : "rgba(0,0,0,0.07)"}`,
                      background: selected.has(r.id) ? "rgba(229,62,62,0.04)" : "#e8eaed",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "4px",
                        border: `2px solid ${selected.has(r.id) ? "#e53e3e" : "#ccc"}`,
                        background: selected.has(r.id) ? "#e53e3e" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "all 0.15s",
                      }}
                    >
                      {selected.has(r.id) && (
                        <span style={{ color: "white", fontSize: "0.6rem", fontWeight: 700 }}>
                          ✓
                        </span>
                      )}
                    </div>
                    <ProjectIcon
                      name={r.project_icon}
                      size={13}
                      color={selected.has(r.id) ? "#e53e3e" : "#888"}
                    />
                    <div style={{ textAlign: "left" }}>
                      <div
                        style={{
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          color: selected.has(r.id) ? "#e53e3e" : "#555",
                        }}
                      >
                        Rapport — {r.project_name}
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "#aaa" }}>
                        {new Date(r.submitted_at).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Tout sélectionner / désélectionner */}
              <button
                onClick={() =>
                  setSelected(allSelected ? new Set() : new Set(group.reports.map((r) => r.id)))
                }
                style={{
                  marginTop: "8px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.72rem",
                  color: "#aaa",
                  textDecoration: "underline",
                  fontFamily: "inherit",
                }}
              >
                {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
            </div>
          ) : (
            <p
              style={{ fontSize: "0.82rem", color: "#888", lineHeight: 1.6, marginBottom: "12px" }}
            >
              Le rapport du projet{" "}
              <strong style={{ color: "#1A1A1A" }}>{group.reports[0]?.project_name}</strong> sera
              supprimé.
            </p>
          )}

          <p
            style={{ fontSize: "0.78rem", color: "#e53e3e", fontWeight: 500, marginBottom: "4px" }}
          >
            Cette action est irréversible.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", padding: "16px 24px 24px" }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "10px",
              border: "1.5px solid rgba(0,0,0,0.08)",
              background: "#e8eaed",
              color: "#666",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(Array.from(selected))}
            disabled={loading || noneSelected}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "10px",
              border: "none",
              background: loading || noneSelected ? "rgba(229,62,62,0.4)" : "#e53e3e",
              color: "white",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: loading || noneSelected ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {loading
              ? "Suppression..."
              : `Supprimer${selected.size > 1 ? ` (${selected.size})` : ""}`}
          </button>
        </div>
      </div>
      <style>{`@keyframes popIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }`}</style>
    </div>
  );
}

// ── Modal vue rapport — affichage liste complète ─────────────────────────────

function GroupModal({ group, onClose }: { group: ReportGroup; onClose: () => void }) {
  const [activeProject, setActiveProject] = useState(0);
  const report = group.reports[activeProject];

  // Définition des champs à afficher
  const fields = [
    { key: "working_built", label: "En cours de construction" },
    { key: "extra_message", label: "Message supplémentaire" },
    { key: "blocked", label: "Ce qui est cassé / bloqué" },
    { key: "validated_learning", label: "Apprentissages validés" },
    { key: "needed_learning", label: "Apprentissages nécessaires" },
    { key: "tomorrow_build", label: "Construction de demain" },
  ];

  function goToProject(i: number) {
    setActiveProject(i);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "700px",
          maxHeight: "85vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px rgba(0,0,0,0.15)",
          animation: "popIn 0.2s ease",
        }}
      >
        {/* ── Header utilisateur ── */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(0,0,0,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Avatar name={group.full_name} />
            <div>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "#1A1A1A" }}>
                {group.full_name}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#aaa", marginTop: "2px" }}>
                {new Date(group.submitted_at).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                {" · "}
                {new Date(group.submitted_at).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <RoleBadge role={group.role} />
            <button
              onClick={onClose}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                border: "1px solid rgba(0,0,0,0.08)",
                background: "#e8eaed",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#888",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#e8e4df";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#e8eaed";
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Navigation projets ── */}
        <div
          style={{
            background: "rgba(107,26,42,0.04)",
            borderBottom: "1px solid rgba(107,26,42,0.08)",
            padding: "12px 20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => goToProject(Math.max(0, activeProject - 1))}
              disabled={activeProject === 0}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                border: "1.5px solid rgba(0,0,0,0.08)",
                background: activeProject === 0 ? "transparent" : "#fff",
                color: activeProject === 0 ? "#ddd" : "#6B1A2A",
                fontSize: "1rem",
                cursor: activeProject === 0 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.15s",
              }}
            >
              ‹
            </button>

            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <ProjectIcon name={report?.project_icon} size={14} color="#6B1A2A" />
              <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#6B1A2A" }}>
                {report?.project_name}
              </span>
            </div>

            <span style={{ fontSize: "0.7rem", color: "#bbb", flexShrink: 0 }}>
              {activeProject + 1}/{group.reports.length}
            </span>
            <button
              onClick={() => goToProject(Math.min(group.reports.length - 1, activeProject + 1))}
              disabled={activeProject === group.reports.length - 1}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                border: "1.5px solid rgba(0,0,0,0.08)",
                background: activeProject === group.reports.length - 1 ? "transparent" : "#fff",
                color: activeProject === group.reports.length - 1 ? "#ddd" : "#6B1A2A",
                fontSize: "1rem",
                cursor: activeProject === group.reports.length - 1 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.15s",
              }}
            >
              ›
            </button>
          </div>

          {/* Pastilles projets */}
          {group.reports.length > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "6px",
                marginTop: "10px",
              }}
            >
              {group.reports.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goToProject(i)}
                  style={{
                    width: i === activeProject ? "20px" : "6px",
                    height: "6px",
                    borderRadius: "3px",
                    border: "none",
                    background: i === activeProject ? "#6B1A2A" : "rgba(107,26,42,0.2)",
                    cursor: "pointer",
                    padding: 0,
                    transition: "all 0.2s",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Contenu en liste complète ── */}
        <div style={{ overflowY: "auto", padding: "24px", flex: 1 }}>
          {fields.map(({ key, label }) => {
            const value = (report?.[key as keyof Report] as string) ?? "";
            return (
              <div key={key} style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#aaa",
                    marginBottom: "8px",
                  }}
                >
                  {label}
                </label>
                <ReportField value={value} />
              </div>
            );
          })}
        </div>

        {/* ── Footer avec bouton fermer ── */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(0,0,0,0.06)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              borderRadius: "10px",
              border: "1.5px solid rgba(0,0,0,0.08)",
              background: "#e8eaed",
              color: "#666",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e8e4df";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#e8eaed";
            }}
          >
            Fermer
          </button>
        </div>
      </div>
      <style>{`@keyframes popIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }`}</style>
    </div>
  );
}

// ── Modal édition ─────────────────────────────────────────────────────────────

function EditModal({
  report,
  onClose,
  onSave,
  loading,
}: {
  report: Report;
  onClose: () => void;
  onSave: (data: Partial<Report>) => Promise<void>;
  loading: boolean;
}) {
  const [formData, setFormData] = useState({
    working_built: report.working_built || "",
    blocked: report.blocked || "",
    validated_learning: report.validated_learning || "",
    needed_learning: report.needed_learning || "",
    tomorrow_build: report.tomorrow_build || "",
    extra_message: report.extra_message || "",
  });
  const fields = [
    { key: "working_built", label: "En cours de construction" },
    { key: "extra_message", label: "Message supplémentaire" },
    { key: "blocked", label: "Ce qui est cassé / bloqué" },
    { key: "validated_learning", label: "Apprentissages validés" },
    { key: "needed_learning", label: "Apprentissages nécessaires" },
    { key: "tomorrow_build", label: "Construction de demain" },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "560px",
          maxHeight: "85vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px rgba(0,0,0,0.15)",
          animation: "popIn 0.2s ease",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(0,0,0,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Avatar name={report.full_name} />
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#1A1A1A" }}>
                Modifier le rapport
              </div>
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "#aaa",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                {report.full_name}
                <span style={{ color: "#ddd" }}>·</span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    color: "#6B1A2A",
                    fontWeight: 600,
                  }}
                >
                  <ProjectIcon name={report.project_icon} size={11} color="#6B1A2A" />
                  {report.project_name}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              border: "1px solid rgba(0,0,0,0.08)",
              background: "#e8eaed",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#888",
            }}
          >
            <X size={14} />
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: "20px 24px", flex: 1 }}>
          {fields.map(({ key, label }) => (
            <div key={key} style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#aaa",
                  marginBottom: "6px",
                }}
              >
                {label}
              </label>
              <div style={{ fontSize: "0.83rem" }} className="rich-editor-compact">
                <RichTextArea
                  value={formData[key as keyof typeof formData]}
                  onChange={(val) => setFormData({ ...formData, [key]: val })}
                />
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            gap: "10px",
            padding: "20px 24px",
            borderTop: "1px solid rgba(0,0,0,0.07)",
          }}
        >
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "10px",
              border: "1.5px solid rgba(0,0,0,0.08)",
              background: "#e8eaed",
              color: "#666",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Annuler
          </button>
          <button
            onClick={() => onSave(formData).then(onClose)}
            disabled={loading}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "10px",
              border: "none",
              background: loading ? "rgba(107,26,42,0.5)" : "#6B1A2A",
              color: "white",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {loading ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes popIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        .rich-editor-compact .ProseMirror { min-height: 70px !important; padding: 10px 14px !important; font-size: 0.83rem !important; }
        .rich-editor-compact .flex.flex-wrap.items-center { padding: 4px 8px !important; gap: 2px !important; }
        .rich-editor-compact button { padding: 3px 6px !important; font-size: 0.75rem !important; }
        .rich-editor-compact .w-px { margin: 0 2px !important; }
      `}</style>
    </div>
  );
}

// ── Export CSV ────────────────────────────────────────────────────────────────

function exportCSV(reports: Report[]) {
  const headers = [
    "Nom",
    "Rôle",
    "Projet",
    "En cours",
    "Message supplémentaire",
    "Bloqué",
    "Apprentissages validés",
    "Apprentissages nécessaires",
    "Demain",
    "Date",
  ];
  const rows = reports.map((r) => [
    r.full_name,
    r.role,
    r.project_name,
    r.working_built,
    r.blocked,
    r.validated_learning,
    r.needed_learning,
    r.tomorrow_build,
    r.extra_message,
    new Date(r.submitted_at).toLocaleDateString("fr-FR"),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rapports-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function RapportsTable({
  reports: initialReports,
  roles,
  projects,
  loading: loadingProp,
  isEmpty,
  onPageChange,
  onSearch,
  totalItems,
  totalPages,
  currentPage,
  roleFilter: roleFilterProp,
  onRoleFilter,
  projectFilter: projectFilterProp,
  onProjectFilter,
  dateFilter: dateFilterProp,
  onDateFilter,
}: Props) {
  const reports = initialReports;
  const [selectedGroup, setSelected] = useState<ReportGroup | null>(null);
  const [editingReport, setEditing] = useState<Report | null>(null);
  const [toDelete, setToDelete] = useState<ReportGroup | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const { mutate } = useSWRConfig();
  const { canEditReports, canDeleteReports } = usePermissions();

  // Utiliser les filtres externes (serveur) ou locaux
  const roleFilter = roleFilterProp ?? "";
  const projectFilter = projectFilterProp !== undefined ? String(projectFilterProp ?? "") : "";
  const dateFilter = dateFilterProp ?? "";

  function addToast(type: Toast["type"], message: string) {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  async function handleDelete(reportIds: number[]) {
    if (!toDelete) return;
    setDeleting(true);
    const results = await Promise.all(reportIds.map((id) => deleteReport(id)));
    setDeleting(false);
    setToDelete(null);
    if (results.every((r) => r.success)) {
      addToast(
        "success",
        `${reportIds.length > 1 ? `${reportIds.length} rapports supprimés` : "Rapport supprimé"} pour ${toDelete.full_name}.`
      );
      // ✅ Refresh via SWR
      await mutate((key) => typeof key === "string" && key.includes("/api/rapports"));
    } else {
      addToast("error", "Erreur lors de la suppression.");
    }
  }

  async function handleEdit(data: Partial<Report>) {
    if (!editingReport) return;
    setSaving(true);
    const result = await updateReport(editingReport.id, {
      working_built: data.working_built,
      broken_features: data.blocked,
      validated_learning: data.validated_learning,
      needed_learning: data.needed_learning,
      tomorrow_build: data.tomorrow_build,
      extra_message: data.extra_message,
    });
    setSaving(false);
    if (result.success) {
      addToast("success", `Rapport modifié.`);
      setEditing(null);
      // ✅ Refresh via SWR
      await mutate((key) => typeof key === "string" && key.includes("/api/rapports"));
    } else {
      addToast("error", result.error ?? "Erreur lors de la modification.");
    }
  }

  // Les rapports sont déjà filtrés côté serveur, on les groupe directement
  const groups = useMemo(() => {
    return groupReports(reports);
  }, [reports]);

  const filterSlot = (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      {[
        {
          value: projectFilter,
          onChange: (v: string) => onProjectFilter?.(v ? parseInt(v) : undefined),
          placeholder: "Tous les projets",
          options: projects.map((p) => ({ value: String(p.id), label: p.name })),
        },
        {
          value: roleFilter,
          onChange: (v: string) => onRoleFilter?.(v),
          placeholder: "Tous les rôles",
          options: roles.map((r) => ({ value: r, label: r })),
        },
        {
          value: dateFilter,
          onChange: (v: string) => onDateFilter?.(v),
          placeholder: "",
          options: [
            { value: "today", label: "Aujourd'hui" },
            { value: "week", label: "Cette semaine" },
            { value: "month", label: "Ce mois" },
          ],
        },
      ].map((f, idx) => (
        <div key={idx} style={{ position: "relative" }}>
          <select
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            style={{
              appearance: "none",
              paddingLeft: "12px",
              paddingRight: "28px",
              paddingTop: "8px",
              paddingBottom: "8px",
              border: "1.5px solid rgba(0,0,0,0.08)",
              borderRadius: "10px",
              background: "#e8eaed",
              fontSize: "0.82rem",
              fontFamily: "'DM Sans', sans-serif",
              color: f.value ? "#1A1A1A" : "#aaa",
              outline: "none",
              cursor: "pointer",
            }}
          >
            {f.placeholder && <option value="">{f.placeholder}</option>}
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            style={{
              position: "absolute",
              right: "8px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#aaa",
              pointerEvents: "none",
            }}
          />
        </div>
      ))}
      <button
        onClick={() => exportCSV(reports)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginLeft: "auto",
          padding: "8px 14px",
          borderRadius: "10px",
          border: "1.5px solid rgba(0,0,0,0.08)",
          background: "#e8eaed",
          color: "#666",
          fontSize: "0.82rem",
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(107,26,42,0.07)";
          e.currentTarget.style.color = "#6B1A2A";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#e8eaed";
          e.currentTarget.style.color = "#666";
        }}
      >
        <FileDown size={14} /> CSV
      </button>
    </div>
  );

  return (
    <>
      <DataTable
        columns={[
          {
            key: "full_name",
            label: "Membre",
            sortable: true,
            render: (g: ReportGroup) => (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Avatar name={g.full_name} />
                <span style={{ fontWeight: 500, fontSize: "0.83rem" }}>{g.full_name}</span>
              </div>
            ),
          },
          {
            key: "projects",
            label: "Projets",
            render: (g: ReportGroup) => (
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                {g.reports.map((r) => (
                  <span
                    key={r.id}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      color: "#6B1A2A",
                      background: "rgba(107,26,42,0.07)",
                      padding: "2px 8px",
                      borderRadius: "20px",
                      border: "1px solid rgba(107,26,42,0.1)",
                    }}
                  >
                    <ProjectIcon name={r.project_icon} size={11} color="#6B1A2A" />
                    {r.project_name}
                  </span>
                ))}
              </div>
            ),
          },
          {
            key: "role",
            label: "Rôle",
            sortable: true,
            render: (g: ReportGroup) => <RoleBadge role={g.role} />,
          },
          {
            key: "submitted_at",
            label: "Date",
            sortable: true,
            render: (g: ReportGroup) => (
              <span style={{ fontSize: "0.75rem", color: "#aaa", whiteSpace: "nowrap" }}>
                {new Date(g.submitted_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}{" "}
                <span style={{ color: "#ccc" }}>
                  {new Date(g.submitted_at).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </span>
            ),
          },
        ]}
        data={groups}
        actions={[
          { icon: "view", label: "Voir le rapport", onClick: (g: ReportGroup) => setSelected(g) },
          ...(canEditReports
            ? [
                {
                  icon: "edit" as const,
                  label: "Modifier",
                  onClick: (g: ReportGroup) => setEditing(g.reports[0]),
                },
              ]
            : []),
          ...(canDeleteReports
            ? [
                {
                  icon: "delete" as const,
                  label: "Supprimer",
                  onClick: (g: ReportGroup) => setToDelete(g),
                },
              ]
            : []),
        ]}
        pageSize={10}
        searchPlaceholder="Rechercher un membre..."
        emptyMessage={isEmpty ? "Aucun rapport pour le moment." : "Aucun rapport trouvé."}
        filters={filterSlot}
        loading={loadingProp}
        // Pagination serveur
        onPageChange={onPageChange}
        onSearch={onSearch}
        totalItems={totalItems}
        totalPages={totalPages}
        currentPage={currentPage}
      />

      {selectedGroup && <GroupModal group={selectedGroup} onClose={() => setSelected(null)} />}
      {editingReport && (
        <EditModal
          report={editingReport}
          onClose={() => setEditing(null)}
          onSave={handleEdit}
          loading={saving}
        />
      )}
      {toDelete && (
        <DeleteModal
          group={toDelete}
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
          loading={deleting}
        />
      )}
      {toasts.map((t) => (
        <ToastNotification
          key={t.id}
          toast={t}
          onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
        />
      ))}
    </>
  );
}
