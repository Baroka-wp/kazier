"use client";

import { Task, createTask, updateTask } from "@/lib/task-actions";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

type Props = {
  show: boolean;
  mode: "create" | "edit";
  task?: Task | null;
  projectId: number;
  teamMembers?: Array<{ id: number; first_name: string; last_name: string }>;
  onClose: () => void;
  onSuccess: () => void;
};

type TaskFormData = {
  title: string;
  description: string;
  status: "à faire" | "en cours" | "review" | "terminée";
  priority: "low" | "medium" | "high";
  assigned_to: number[];
  start_date: string;
  due_date: string;
};

export default function TaskFormModal({
  show,
  mode,
  task,
  projectId,
  teamMembers = [],
  onClose,
  onSuccess,
}: Props) {
  // Format date for datetime-local input (YYYY-MM-DDTHH:MM)
  const formatDateForInput = (dateStr: string | null | undefined): string => {
    if (!dateStr) {
      // Return current local time
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    // Handle "YYYY-MM-DD HH:MM" format
    if (dateStr.includes(" ")) {
      return dateStr.replace(" ", "T");
    }

    // Handle ISO string
    if (dateStr.includes("T")) {
      return dateStr.substring(0, 16);
    }

    return dateStr;
  };

  // Initialize form data
  const getInitialFormData = (): TaskFormData => {
    if (mode === "edit" && task) {
      return {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigned_to: task.assigned_to || [],
        start_date: formatDateForInput(task.start_date),
        due_date: formatDateForInput(task.due_date),
      };
    }

    // Create mode - default values
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      title: "",
      description: "",
      status: "à faire",
      priority: "medium",
      assigned_to: [],
      start_date: formatDateForInput(null),
      due_date: formatDateForInput(null).replace(/T\d{2}:\d{2}/, "T17:00"), // Tomorrow at 17:00
    };
  };

  const [formData, setFormData] = useState<TaskFormData>(getInitialFormData());
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens or task changes
  useEffect(() => {
    if (show) {
      setFormData(getInitialFormData());
    }
  }, [show, mode, task?.id]);

  // Convert datetime-local format to backend format (YYYY-MM-DD HH:MM)
  const formatDateForBackend = (dateStr: string): string => {
    if (!dateStr) return "";
    return dateStr.replace("T", " ");
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (mode === "edit" && task) {
        await updateTask(task.id, {
          title: formData.title,
          description: formData.description,
          status: formData.status,
          priority: formData.priority,
          assigned_to: formData.assigned_to,
          start_date: formatDateForBackend(formData.start_date),
          due_date: formatDateForBackend(formData.due_date),
        });
      } else {
        await createTask({
          title: formData.title,
          description: formData.description,
          status: formData.status,
          priority: formData.priority,
          project_id: projectId,
          assigned_to: formData.assigned_to,
          start_date: formatDateForBackend(formData.start_date),
          due_date: formatDateForBackend(formData.due_date),
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("[TaskFormModal] Error:", error);
      alert("Erreur lors de l'enregistrement de la tâche");
    } finally {
      setSubmitting(false);
    }
  }

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#F5F2ED",
          borderRadius: "0",
          border: "1px solid rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: "700px",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#1A1A1A", margin: 0 }}>
            {mode === "edit" ? "Éditer la tâche" : "Nouvelle tâche"}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              color: "#666",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Title */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "#333",
                  marginBottom: "8px",
                }}
              >
                Titre *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "0",
                  border: "1px solid rgba(0,0,0,0.15)",
                  fontSize: "0.95rem",
                  fontFamily: "'DM Sans', sans-serif",
                  outline: "none",
                  background: "#fff",
                  color: "#1A1A1A",
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "#333",
                  marginBottom: "8px",
                }}
              >
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "0",
                  border: "1px solid rgba(0,0,0,0.15)",
                  fontSize: "0.95rem",
                  fontFamily: "'DM Sans', sans-serif",
                  outline: "none",
                  resize: "vertical",
                  background: "#fff",
                  color: "#1A1A1A",
                }}
              />
            </div>

            {/* Date range */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: "#333",
                    marginBottom: "8px",
                  }}
                >
                  Date de début *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "0",
                    border: "1px solid rgba(0,0,0,0.15)",
                    fontSize: "0.95rem",
                    fontFamily: "'DM Sans', sans-serif",
                    outline: "none",
                    background: "#fff",
                    color: "#1A1A1A",
                    colorScheme: "light",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: "#333",
                    marginBottom: "8px",
                  }}
                >
                  Date de fin *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "0",
                    border: "1px solid rgba(0,0,0,0.15)",
                    fontSize: "0.95rem",
                    fontFamily: "'DM Sans', sans-serif",
                    outline: "none",
                    background: "#fff",
                    color: "#1A1A1A",
                    colorScheme: "light",
                  }}
                />
              </div>
            </div>

            {/* Status & Priority */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: "#333",
                    marginBottom: "8px",
                  }}
                >
                  Statut
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as TaskFormData["status"] })
                  }
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "0",
                    border: "1px solid rgba(0,0,0,0.15)",
                    fontSize: "0.95rem",
                    fontFamily: "'DM Sans', sans-serif",
                    outline: "none",
                    background: "#fff",
                    color: "#1A1A1A",
                  }}
                >
                  <option value="à faire">À faire</option>
                  <option value="en cours">En cours</option>
                  <option value="review">Review</option>
                  <option value="terminée">Terminée</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: "#333",
                    marginBottom: "8px",
                  }}
                >
                  Priorité
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: e.target.value as TaskFormData["priority"],
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "0",
                    border: "1px solid rgba(0,0,0,0.15)",
                    fontSize: "0.95rem",
                    fontFamily: "'DM Sans', sans-serif",
                    outline: "none",
                    background: "#fff",
                    color: "#1A1A1A",
                  }}
                >
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                </select>
              </div>
            </div>

            {/* Assigned to */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "#333",
                  marginBottom: "8px",
                }}
              >
                Assigné à
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                  padding: "12px",
                  background: "#fafafa",
                  border: "1px solid rgba(0,0,0,0.15)",
                  borderRadius: "0",
                  maxHeight: "200px",
                  overflowY: "auto",
                  minHeight: "80px",
                }}
              >
                {teamMembers.length === 0 ? (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      textAlign: "center",
                      color: "#999",
                      fontSize: "0.85rem",
                      padding: "20px",
                    }}
                  >
                    Aucun membre dans ce projet
                  </div>
                ) : (
                  teamMembers.map((member) => {
                    const fullName = `${member.first_name} ${member.last_name}`;
                    const isChecked = formData.assigned_to.includes(member.id);
                    return (
                      <label
                        key={member.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 10px",
                          background: isChecked ? "rgba(107,26,42,0.08)" : "#fff",
                          border: isChecked ? "1px solid #6B1A2A" : "1px solid rgba(0,0,0,0.08)",
                          borderRadius: "0",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          if (!isChecked) {
                            e.currentTarget.style.background = "#f0f0f0";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isChecked) {
                            e.currentTarget.style.background = "#fff";
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setFormData({
                                ...formData,
                                assigned_to: formData.assigned_to.filter((id) => id !== member.id),
                              });
                            } else {
                              setFormData({
                                ...formData,
                                assigned_to: [...formData.assigned_to, member.id],
                              });
                            }
                          }}
                          style={{
                            width: "16px",
                            height: "16px",
                            cursor: "pointer",
                            accentColor: "#6B1A2A",
                          }}
                        />
                        <span
                          style={{
                            fontSize: "0.85rem",
                            color: isChecked ? "#6B1A2A" : "#333",
                            fontWeight: isChecked ? 600 : 400,
                          }}
                        >
                          {fullName}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              {teamMembers.length > 0 && (
                <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "6px" }}>
                  Sélectionnez un ou plusieurs membres
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
              marginTop: "28px",
              paddingTop: "24px",
              borderTop: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: "12px 24px",
                borderRadius: "0",
                border: "1px solid rgba(0,0,0,0.15)",
                background: "#fff",
                color: "#666",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "12px 24px",
                borderRadius: "0",
                border: "1px solid rgba(107,26,42,0.2)",
                background: submitting ? "#ccc" : "#6B1A2A",
                color: "#fff",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {submitting ? "Enregistrement..." : mode === "edit" ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
