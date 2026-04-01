"use client";

import { Task } from "@/lib/task-actions";
import { Milestone } from "@/lib/milestone-actions";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Flag,
  Trash2,
  Pencil,
  ZoomIn,
  ZoomOut,
  Plus,
  Calendar,
} from "lucide-react";
import TaskFormModal from "./TaskFormModal";

type Props = {
  tasks: Task[];
  milestones: Milestone[];
  projectStart: Date | null;
  projectEnd: Date | null;
  projectId: number;
  teamMembers?: Array<{ id: number; first_name: string; last_name: string }>;
  onAddMilestone?: () => void;
  onEditMilestone?: (milestone: Milestone) => void;
  onDeleteMilestone?: (id: number) => void;
  onTaskUpdate?: () => void;
};

export default function GanttChart({
  tasks,
  milestones,
  projectStart,
  projectEnd,
  projectId,
  teamMembers = [],
  onAddMilestone,
  onEditMilestone,
  onDeleteMilestone,
  onTaskUpdate,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [hoveredTask, setHoveredTask] = useState<number | null>(null);
  const [draggingTask, setDraggingTask] = useState<number | null>(null);
  const [resizingTask, setResizingTask] = useState<number | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<"create" | "edit">("create");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const chartRef = useRef<HTMLDivElement>(null);

  // Calculate date range
  const safeProjectStart = projectStart ? new Date(projectStart) : null;
  const safeProjectEnd = projectEnd ? new Date(projectEnd) : null;

  const allDates = [
    safeProjectStart,
    safeProjectEnd,
    ...tasks.map((t) => (t.due_date ? new Date(t.due_date) : null)),
    ...milestones.map((m) => new Date(m.due_date)),
  ].filter((d): d is Date => d !== null && !isNaN(d.getTime()));

  const minDate =
    allDates.length > 0 ? new Date(Math.min(...allDates.map((d) => d.getTime()))) : new Date();
  const maxDate =
    allDates.length > 0 ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : new Date();

  // Add padding
  minDate.setDate(minDate.getDate() - 7);
  maxDate.setDate(maxDate.getDate() + 14);

  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
  const dayWidth = 30 * zoom; // pixels per day
  const chartWidth = totalDays * dayWidth;

  // Get today's position
  const today = new Date();
  const todayPosition = ((today.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;

  // Generate day headers
  const days: { date: Date; day: number; month: number; isMonday: boolean }[] = [];
  const currentDate = new Date(minDate);
  while (currentDate <= maxDate) {
    days.push({
      date: new Date(currentDate),
      day: currentDate.getDate(),
      month: currentDate.getMonth(),
      isMonday: currentDate.getDay() === 1,
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Generate month headers
  const months: { name: string; start: number; width: number }[] = [];
  const monthDate = new Date(minDate);
  while (monthDate <= maxDate) {
    const monthStart = new Date(monthDate);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const effectiveEnd = monthEnd > maxDate ? maxDate : monthEnd;
    const startOffset = (monthStart.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    const endOffset = (effectiveEnd.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    const width = (endOffset - startOffset + 1) * dayWidth;

    months.push({
      name: monthDate.toLocaleDateString("fr-FR", { month: "long", year: "2-digit" }),
      start: startOffset * dayWidth,
      width,
    });

    monthDate.setMonth(monthDate.getMonth() + 1);
  }

  function getPosition(date: Date | null): number {
    if (!date) return 0;
    return ((date.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;
  }



  const statusColors: Record<string, { bg: string; border: string; text: string }> = {
    "à faire": { bg: "rgba(180,83,9,0.2)", border: "#b45309", text: "#b45309" },
    "en cours": { bg: "rgba(37,99,235,0.2)", border: "#2563eb", text: "#2563eb" },
    review: { bg: "rgba(124,58,237,0.2)", border: "#7c3aed", text: "#7c3aed" },
    terminée: { bg: "rgba(22,163,74,0.2)", border: "#16a34a", text: "#16a34a" },
  };

  // Drag and drop handlers
  const handleTaskMouseDown = useCallback(
    (e: React.MouseEvent, task: Task) => {
      if ((e.target as HTMLElement).closest(".task-resize-handle")) return;
      e.stopPropagation();
      setDraggingTask(task.id);
      setDragStartX(e.clientX);
    },
    []
  );

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, taskId: number) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingTask(taskId);
    setDragStartX(e.clientX);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (draggingTask) {
        const deltaX = e.clientX - dragStartX;
        const deltaDays = deltaX / dayWidth;
        const task = tasks.find((t) => t.id === draggingTask);
        if (task && task.due_date) {
          const newDate = new Date(task.due_date);
          newDate.setDate(newDate.getDate() + Math.round(deltaDays));
          // Here you would call an API to update the task
        }
      } else if (resizingTask) {
        const deltaX = e.clientX - dragStartX;
        const deltaDays = deltaX / dayWidth;
        const task = tasks.find((t) => t.id === resizingTask);
        if (task && task.due_date) {
          const newDate = new Date(task.due_date);
          newDate.setDate(newDate.getDate() + Math.round(deltaDays));
          // Here you would call an API to update the task
        }
      }
    },
    [draggingTask, resizingTask, dragStartX, dayWidth, tasks]
  );

  const handleMouseUp = useCallback(async () => {
    if (draggingTask || resizingTask) {
      // Save changes here
      setDraggingTask(null);
      setResizingTask(null);
      onTaskUpdate?.();
    }
  }, [draggingTask, resizingTask, onTaskUpdate]);

  useEffect(() => {
    if (draggingTask || resizingTask) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [draggingTask, resizingTask, handleMouseMove, handleMouseUp]);

  function handleTaskModalSuccess() {
    setShowTaskModal(false);
    setEditingTask(null);
    onTaskUpdate?.();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          background: "#fff",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
            style={{
              padding: "6px 10px",
              borderRadius: "0",
              border: "1px solid rgba(0,0,0,0.15)",
              background: "#fff",
              color: "#666",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            <ZoomOut size={14} />
            Dézoomer
          </button>
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#666" }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(Math.min(2, zoom + 0.25))}
            style={{
              padding: "6px 10px",
              borderRadius: "0",
              border: "1px solid rgba(0,0,0,0.15)",
              background: "#fff",
              color: "#666",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            <ZoomIn size={14} />
            Zoomer
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => {
              setTaskModalMode("create");
              setEditingTask(null);
              setShowTaskModal(true);
            }}
            style={{
              padding: "8px 14px",
              borderRadius: "0",
              border: "none",
              background: "#6B1A2A",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.8rem",
              fontWeight: 700,
            }}
          >
            <Plus size={14} />
            Nouvelle tâche
          </button>
          {onAddMilestone && (
            <button
              onClick={onAddMilestone}
              style={{
                padding: "8px 14px",
                borderRadius: "0",
                border: "1px solid #6B1A2A",
                background: "#fff",
                color: "#6B1A2A",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.8rem",
                fontWeight: 700,
              }}
            >
              <Flag size={14} />
              Ajouter un jalon
            </button>
          )}
        </div>
      </div>

      {/* Header with months and grid */}
      <div
        style={{
          position: "relative",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          background: "#fff",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {/* Month headers */}
        <div style={{ display: "flex", height: "40px", position: "relative" }}>
          {months.map((month, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: month.start,
                width: month.width,
                textAlign: "center",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "#666",
                textTransform: "capitalize",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRight: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              {month.name}
            </div>
          ))}
        </div>
        {/* Day headers */}
        <div style={{ display: "flex", height: "28px", position: "relative", background: "#fafafa" }}>
          {days.map((day, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: i * dayWidth,
                width: dayWidth,
                textAlign: "center",
                fontSize: "0.65rem",
                fontWeight: day.isMonday ? 700 : 500,
                color: day.isMonday ? "#666" : "#999",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRight: day.isMonday ? "1px solid rgba(0,0,0,0.15)" : "1px solid rgba(0,0,0,0.04)",
                background: day.isMonday ? "rgba(0,0,0,0.02)" : "transparent",
              }}
            >
              {day.day}
            </div>
          ))}
        </div>
      </div>

      {/* Chart content */}
      <div
        ref={chartRef}
        style={{
          flex: 1,
          overflow: "auto",
          position: "relative",
          background: "#fafafa",
        }}
      >
        {/* Grid lines */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: "none",
          }}
        >
          {days.map((day, i) =>
            day.isMonday ? (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: i * dayWidth,
                  top: 0,
                  bottom: 0,
                  width: "1px",
                  background: "rgba(0,0,0,0.08)",
                }}
              />
            ) : null
          )}
          {/* Today line */}
          <div
            style={{
              position: "absolute",
              left: todayPosition,
              top: 0,
              bottom: 0,
              width: "2px",
              background: "#dc2626",
              zIndex: 10,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                background: "#dc2626",
                color: "#fff",
                fontSize: "0.65rem",
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: "0 0 4px 4px",
                whiteSpace: "nowrap",
              }}
            >
              AUJ.
            </div>
          </div>
        </div>

        <div style={{ width: chartWidth, padding: "16px", minHeight: "100%" }}>
          {/* Milestones */}
          {milestones.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <div
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#888",
                  marginBottom: "12px",
                }}
              >
                 Jalons
              </div>
              <div style={{ position: "relative", minHeight: "60px" }}>
                {milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    style={{
                      position: "absolute",
                      left: getPosition(new Date(milestone.due_date)),
                      transform: "translateX(-50%)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                      cursor: "pointer",
                      zIndex: 20,
                    }}
                    onClick={() => onEditMilestone?.(milestone)}
                  >
                    <div
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: "10px solid transparent",
                        borderRight: "10px solid transparent",
                        borderBottom: "20px solid #6B1A2A",
                        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#6B1A2A",
                        whiteSpace: "nowrap",
                        background: "#fff",
                        padding: "3px 8px",
                        borderRadius: "0",
                        border: "1px solid rgba(107,26,42,0.2)",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      }}
                    >
                      {milestone.title}
                    </span>
                    <div
                      style={{
                        display: "flex",
                        gap: "4px",
                        opacity: hoveredTask === milestone.id ? 1 : 0,
                        transition: "opacity 0.15s",
                      }}
                      onMouseEnter={() => setHoveredTask(milestone.id)}
                      onMouseLeave={() => setHoveredTask(null)}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditMilestone?.(milestone);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#666",
                          padding: "2px",
                          display: "flex",
                        }}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteMilestone?.(milestone.id);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#dc2626",
                          padding: "2px",
                          display: "flex",
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          <div>
            <div
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#888",
                marginBottom: "12px",
              }}
            >
              📋 Tâches
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {tasks.length === 0 ? (
                <div
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "#999",
                    fontSize: "0.85rem",
                  }}
                >
                  Aucune tâche pour ce projet
                </div>
              ) : (
                tasks.map((task) => {
                  const colors =
                    statusColors[task.status || "à faire"] || statusColors["à faire"];
                  const taskDate = task.due_date ? new Date(task.due_date) : null;
                  const position = getPosition(taskDate);
                  const isDragging = draggingTask === task.id;
                  const isResizing = resizingTask === task.id;

                  return (
                    <div
                      key={task.id}
                      style={{
                        position: "relative",
                        height: "52px",
                        cursor: isDragging ? "grabbing" : "grab",
                      }}
                      onMouseEnter={(e) => {
                        setHoveredTask(task.id);
                        setTooltipPos({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseLeave={() => {
                        setHoveredTask(null);
                        setTooltipPos(null);
                      }}
                      onMouseMove={(e) => {
                        if (hoveredTask === task.id) {
                          setTooltipPos({ x: e.clientX, y: e.clientY });
                        }
                      }}
                    >
                      {/* Task bar */}
                      <div
                        onMouseDown={(e) => handleTaskMouseDown(e, task)}
                        onDoubleClick={() => {
                          setTaskModalMode("edit");
                          setEditingTask(task);
                          setShowTaskModal(true);
                        }}
                        style={{
                          position: "absolute",
                          left: Math.max(0, position),
                          width: "120px",
                          height: "40px",
                          top: "6px",
                          background: colors.bg,
                          border: `2px solid ${colors.border}`,
                          borderRadius: "0",
                          display: "flex",
                          alignItems: "center",
                          padding: "0 12px",
                          transition: isDragging || isResizing ? "none" : "all 0.15s",
                          boxShadow:
                            hoveredTask === task.id || isDragging
                              ? "0 4px 12px rgba(0,0,0,0.15)"
                              : "0 2px 4px rgba(0,0,0,0.08)",
                          opacity: isDragging ? 0.8 : 1,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            color: colors.text,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            flex: 1,
                          }}
                        >
                          {task.title}
                        </span>
                        {task.due_date && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              color: colors.text,
                              marginLeft: "8px",
                              whiteSpace: "nowrap",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Calendar size={10} />
                            {new Date(task.due_date).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        )}
                        {/* Resize handle */}
                        <div
                          className="task-resize-handle"
                          onMouseDown={(e) => handleResizeMouseDown(e, task.id)}
                          style={{
                            width: "8px",
                            height: "100%",
                            cursor: "ew-resize",
                            background: "rgba(0,0,0,0.1)",
                            marginLeft: "8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <div
                            style={{
                              width: "2px",
                              height: "16px",
                              background: "rgba(0,0,0,0.3)",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task tooltip */}
      {tooltipPos && hoveredTask && (
        <div
          style={{
            position: "fixed",
            left: tooltipPos.x + 10,
            top: tooltipPos.y - 10,
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.15)",
            borderRadius: "0",
            padding: "12px 14px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            pointerEvents: "none",
            minWidth: "220px",
            maxWidth: "320px",
          }}
        >
          {(() => {
            const task = tasks.find((t) => t.id === hoveredTask);
            if (!task) return null;
            return (
              <>
                <div
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#888",
                    marginBottom: "8px",
                  }}
                >
                  Tâche
                </div>
                <div
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    color: "#1A1A1A",
                    marginBottom: "8px",
                  }}
                >
                  {task.title}
                </div>
                {task.description && (
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#666",
                      marginBottom: "8px",
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {task.description}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    fontSize: "0.75rem",
                  }}
                >
                  {task.status && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#888" }}>Statut</span>
                      <span style={{ fontWeight: 600, color: "#1A1A1A", textTransform: "capitalize" }}>
                        {task.status}
                      </span>
                    </div>
                  )}
                  {task.priority && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#888" }}>Priorité</span>
                      <span
                        style={{
                          fontWeight: 600,
                          color:
                            task.priority === "high"
                              ? "#dc2626"
                              : task.priority === "medium"
                              ? "#b45309"
                              : "#16a34a",
                          textTransform: "capitalize",
                        }}
                      >
                        {task.priority === "high"
                          ? "Haute"
                          : task.priority === "medium"
                          ? "Moyenne"
                          : "Basse"}
                      </span>
                    </div>
                  )}
                  {task.due_date && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#888" }}>Échéance</span>
                      <span style={{ fontWeight: 600, color: "#1A1A1A" }}>
                        {new Date(task.due_date).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* TaskFormModal */}
      <TaskFormModal
        show={showTaskModal}
        mode={taskModalMode}
        task={editingTask}
        projectId={projectId}
        teamMembers={teamMembers}
        onClose={() => setShowTaskModal(false)}
        onSuccess={handleTaskModalSuccess}
      />
    </div>
  );
}
