"use client";

import { Task, updateTask } from "@/lib/task-actions";
import { Milestone } from "@/lib/milestone-actions";
import { useState, useRef, useCallback, useEffect } from "react";
import { Flag, ZoomIn, ZoomOut, Plus, Calendar, Clock, User } from "lucide-react";
import TaskFormModal from "./TaskFormModal";

type Props = {
  tasks: Task[];
  milestones: Milestone[];
  projectStart: Date | null;
  projectEnd: Date | null;
  projectId: string;
  teamMembers?: Array<{ id: string; first_name: string; last_name: string }>;
  onAddMilestone?: () => void;
  onEditMilestone?: (milestone: Milestone) => void;
  onDeleteMilestone?: (id: string) => void;
  onTaskUpdate?: () => void;
};

type TaskLayout = {
  task: Task;
  row: number;
  startPos: number;
  endPos: number;
  width: number;
  duration: number;
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
  onTaskUpdate,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [draggingTask, setDraggingTask] = useState<{
    task: Task;
    offsetX: number;
    originalStartDate: Date;
    originalDueDate: Date;
  } | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<"create" | "edit">("create");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const chartRef = useRef<HTMLDivElement>(null);

  // Calculate date range
  const safeProjectStart = projectStart ? new Date(projectStart) : null;
  const safeProjectEnd = projectEnd ? new Date(projectEnd) : null;

  const allDates = [
    safeProjectStart,
    safeProjectEnd,
    ...tasks.flatMap((t) => [
      t.start_date ? new Date(t.start_date) : null,
      t.due_date ? new Date(t.due_date) : null,
    ]),
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
  const dayWidth = 35 * zoom;
  const chartWidth = totalDays * dayWidth;
  const ROW_HEIGHT = 70;

  // Get today's position
  const today = new Date();
  const todayPosition = ((today.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;

  // Generate day headers
  const days: { date: Date; day: number; month: number; isMonday: boolean; isWeekend: boolean }[] =
    [];
  const currentDate = new Date(minDate);
  while (currentDate <= maxDate) {
    const dayOfWeek = currentDate.getDay();
    days.push({
      date: new Date(currentDate),
      day: currentDate.getDate(),
      month: currentDate.getMonth(),
      isMonday: dayOfWeek === 1,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
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
      name: monthDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
      start: startOffset * dayWidth,
      width,
    });

    monthDate.setMonth(monthDate.getMonth() + 1);
  }

  const getPosition = useCallback(
    (date: Date | null): number => {
      if (!date) return 0;
      return ((date.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;
    },
    [minDate, dayWidth]
  );

  const getDaysFromPosition = useCallback(
    (position: number): number => {
      return position / dayWidth;
    },
    [dayWidth]
  );

  function addDaysToDate(date: Date, days: number): Date {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
  }

  function formatDateForBackend(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  function getDaysBetween(start: Date, end: Date): number {
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Smart row layout algorithm
  function calculateTaskLayouts(tasks: Task[]): TaskLayout[] {
    const layouts: TaskLayout[] = [];
    const rows: { start: number; end: number }[] = [];

    // Sort tasks by start date
    const sortedTasks = [...tasks].sort((a, b) => {
      const aStart = a.start_date
        ? new Date(a.start_date).getTime()
        : a.due_date
          ? new Date(a.due_date).getTime()
          : 0;
      const bStart = b.start_date
        ? new Date(b.start_date).getTime()
        : b.due_date
          ? new Date(b.due_date).getTime()
          : 0;
      return aStart - bStart;
    });

    for (const task of sortedTasks) {
      const startDate = task.start_date
        ? new Date(task.start_date)
        : task.due_date
          ? new Date(task.due_date)
          : null;
      const dueDate = task.due_date ? new Date(task.due_date) : startDate;

      if (!startDate || !dueDate) continue;

      const duration = getDaysBetween(startDate, dueDate);
      const startPos = getPosition(startDate);
      const endPos = getPosition(dueDate);
      const width = Math.max(endPos - startPos, 150); // Minimum width

      // Find the first row where this task fits
      let row = 0;
      while (row < rows.length) {
        if (startPos >= rows[row].end + 15) {
          // 15px gap
          rows[row] = { start: startPos, end: startPos + width };
          break;
        }
        row++;
      }

      // If no row found, create a new one
      if (row === rows.length) {
        rows.push({ start: startPos, end: startPos + width });
      }

      layouts.push({
        task,
        row,
        startPos,
        endPos,
        width,
        duration,
      });
    }

    return layouts;
  }

  const taskLayouts = calculateTaskLayouts(tasks);

  const statusColors: Record<string, { bg: string; border: string; text: string; shadow: string }> =
    {
      "à faire": {
        bg: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
        border: "#F59E0B",
        text: "#92400E",
        shadow: "0 4px 12px rgba(245,158,11,0.25)",
      },
      "en cours": {
        bg: "linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)",
        border: "#3B82F6",
        text: "#1E40AF",
        shadow: "0 4px 12px rgba(59,130,246,0.25)",
      },
      review: {
        bg: "linear-gradient(135deg, #E9D5FF 0%, #D8B4FE 100%)",
        border: "#A855F7",
        text: "#6B21A8",
        shadow: "0 4px 12px rgba(168,85,247,0.25)",
      },
      terminée: {
        bg: "linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)",
        border: "#10B981",
        text: "#065F46",
        shadow: "0 4px 12px rgba(16,185,129,0.25)",
      },
    };

  // Drag handlers
  const handleTaskMouseDown = useCallback((e: React.MouseEvent, layout: TaskLayout) => {
    e.stopPropagation();
    if (!layout.task.start_date || !layout.task.due_date) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetX = e.clientX - rect.left;

    setDraggingTask({
      task: layout.task,
      offsetX,
      originalStartDate: new Date(layout.task.start_date),
      originalDueDate: new Date(layout.task.due_date),
    });
    setIsDragging(true);
    setTooltipPos(null);
  }, []);

  const handleMouseMove = useCallback(() => {
    if (!draggingTask || !chartRef.current) return;
  }, [draggingTask]);

  const handleMouseUp = useCallback(
    async (e: MouseEvent) => {
      if (!draggingTask || !chartRef.current) {
        setIsDragging(false);
        return;
      }

      const chartRect = chartRef.current.getBoundingClientRect();
      const mouseX = e.clientX - chartRect.left;
      const newStartPos = mouseX - draggingTask.offsetX;
      const deltaDays = Math.round(
        getDaysFromPosition(newStartPos - getPosition(draggingTask.originalStartDate))
      );

      if (deltaDays !== 0) {
        const newStartDate = addDaysToDate(draggingTask.originalStartDate, deltaDays);
        const newDueDate = addDaysToDate(draggingTask.originalDueDate, deltaDays);

        try {
          await updateTask(draggingTask.task.id, {
            start_date: formatDateForBackend(newStartDate),
            due_date: formatDateForBackend(newDueDate),
          });
          onTaskUpdate?.();
        } catch (error) {
          console.error("Failed to update task:", error);
        }
      }

      setDraggingTask(null);
      setIsDragging(false);
    },
    [draggingTask, onTaskUpdate, getDaysFromPosition, getPosition]
  );

  useEffect(() => {
    if (draggingTask) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [draggingTask, handleMouseMove, handleMouseUp]);

  // Handle cursor style changes
  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = "grabbing";
    } else {
      document.body.style.cursor = "default";
    }
    return () => {
      document.body.style.cursor = "default";
    };
  }, [isDragging]);

  // Auto-scroll to today's position on mount
  useEffect(() => {
    if (chartRef.current && todayPosition > 0) {
      // Center today's position in the viewport
      const scrollLeft = todayPosition - chartRef.current.clientWidth / 2;
      chartRef.current.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: "smooth",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array = run only on mount (todayPosition should not trigger re-scroll)

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
          padding: "16px 20px",
          borderBottom: "2px solid rgba(0,0,0,0.06)",
          background: "linear-gradient(to bottom, #ffffff, #fafafa)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid rgba(0,0,0,0.12)",
              background: "#fff",
              color: "#666",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
              fontWeight: 600,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)";
            }}
          >
            <ZoomOut size={16} />
            Dézoomer
          </button>
          <div
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              background: "rgba(107,26,42,0.08)",
              border: "1px solid rgba(107,26,42,0.2)",
            }}
          >
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#6B1A2A" }}>
              {Math.round(zoom * 100)}%
            </span>
          </div>
          <button
            onClick={() => setZoom(Math.min(2, zoom + 0.25))}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid rgba(0,0,0,0.12)",
              background: "#fff",
              color: "#666",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
              fontWeight: 600,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)";
            }}
          >
            <ZoomIn size={16} />
            Zoomer
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => {
              setTaskModalMode("create");
              setEditingTask(null);
              setShowTaskModal(true);
            }}
            style={{
              padding: "10px 18px",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg, #6B1A2A 0%, #8B2A3A 100%)",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.9rem",
              fontWeight: 700,
              boxShadow: "0 4px 12px rgba(107,26,42,0.3)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(107,26,42,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(107,26,42,0.3)";
            }}
          >
            <Plus size={18} />
            Nouvelle tâche
          </button>
          {onAddMilestone && (
            <button
              onClick={onAddMilestone}
              style={{
                padding: "10px 18px",
                borderRadius: "8px",
                border: "2px solid #6B1A2A",
                background: "#fff",
                color: "#6B1A2A",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.9rem",
                fontWeight: 700,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(107,26,42,0.05)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <Flag size={16} />
              Ajouter un jalon
            </button>
          )}
        </div>
      </div>

      {/* Header with months and grid */}
      <div
        style={{
          position: "relative",
          borderBottom: "2px solid rgba(0,0,0,0.06)",
          background: "#fff",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {/* Month headers */}
        <div
          style={{ display: "flex", height: "48px", position: "relative", background: "#fafafa" }}
        >
          {months.map((month, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: month.start,
                width: month.width,
                textAlign: "center",
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "#444",
                textTransform: "capitalize",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRight: "1px solid rgba(0,0,0,0.08)",
              }}
            >
              {month.name}
            </div>
          ))}
        </div>
        {/* Day headers */}
        <div style={{ display: "flex", height: "36px", position: "relative", background: "#fff" }}>
          {days.map((day, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: i * dayWidth,
                width: dayWidth,
                textAlign: "center",
                fontSize: "0.7rem",
                fontWeight: day.isMonday ? 700 : day.isWeekend ? 600 : 400,
                color: day.isWeekend ? "#dc2626" : day.isMonday ? "#333" : "#999",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                borderRight: day.isMonday
                  ? "2px solid rgba(0,0,0,0.15)"
                  : "1px solid rgba(0,0,0,0.04)",
                background: day.isWeekend
                  ? "rgba(220,38,38,0.04)"
                  : day.isMonday
                    ? "rgba(0,0,0,0.02)"
                    : "transparent",
              }}
            >
              <div style={{ fontSize: "0.85rem", fontWeight: day.isWeekend ? 700 : 600 }}>
                {day.day}
              </div>
              <div style={{ fontSize: "0.6rem", opacity: 0.6, textTransform: "uppercase" }}>
                {day.date.toLocaleDateString("fr-FR", { weekday: "short" }).slice(0, 1)}
              </div>
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
          cursor: isDragging ? "grabbing" : "default",
        }}
      >
        {/* Grid lines and weekend shading */}
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
            day.isWeekend ? (
              <div
                key={`weekend-${i}`}
                style={{
                  position: "absolute",
                  left: i * dayWidth,
                  top: 0,
                  bottom: 0,
                  width: dayWidth,
                  background: "rgba(220,38,38,0.03)",
                }}
              />
            ) : day.isMonday ? (
              <div
                key={`monday-${i}`}
                style={{
                  position: "absolute",
                  left: i * dayWidth,
                  top: 0,
                  bottom: 0,
                  width: "2px",
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
              width: "3px",
              background: "linear-gradient(to bottom, #dc2626 0%, #ef4444 100%)",
              zIndex: 10,
              boxShadow: "0 0 12px rgba(220,38,38,0.4)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -4,
                left: "50%",
                transform: "translateX(-50%)",
                background: "#dc2626",
                color: "#fff",
                fontSize: "0.7rem",
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: "12px",
                whiteSpace: "nowrap",
                boxShadow: "0 2px 8px rgba(220,38,38,0.3)",
              }}
            >
              AUJOURD&apos;HUI
            </div>
          </div>
        </div>

        <div style={{ width: chartWidth, padding: "20px 16px", minHeight: "100%" }}>
          {/* Milestones */}
          {milestones.length > 0 && (
            <div style={{ marginBottom: "32px" }}>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "#666",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Flag size={14} color="#6B1A2A" />
                JALONS
              </div>
              <div style={{ position: "relative", minHeight: "80px", paddingBottom: "20px" }}>
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
                      gap: "6px",
                      cursor: "pointer",
                      zIndex: 20,
                    }}
                    onClick={() => onEditMilestone?.(milestone)}
                  >
                    <div
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: "12px solid transparent",
                        borderRight: "12px solid transparent",
                        borderBottom: "24px solid #6B1A2A",
                        filter: "drop-shadow(0 4px 8px rgba(107,26,42,0.3))",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "#6B1A2A",
                        whiteSpace: "nowrap",
                        background: "#fff",
                        padding: "4px 12px",
                        borderRadius: "6px",
                        border: "2px solid #6B1A2A",
                        boxShadow: "0 4px 12px rgba(107,26,42,0.2)",
                      }}
                    >
                      {milestone.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#666",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Calendar size={14} color="#3B82F6" />
              TÂCHES ({tasks.length})
            </div>
            <div
              style={{
                position: "relative",
                minHeight: taskLayouts.length
                  ? `${Math.max(...taskLayouts.map((l) => l.row)) * ROW_HEIGHT + 120}px`
                  : "300px",
              }}
            >
              {tasks.length === 0 ? (
                <div
                  style={{
                    padding: "60px",
                    textAlign: "center",
                    color: "#999",
                    fontSize: "0.95rem",
                    background: "#fff",
                    borderRadius: "12px",
                    border: "2px dashed rgba(0,0,0,0.1)",
                  }}
                >
                  Aucune tâche pour ce projet
                </div>
              ) : (
                taskLayouts.map((layout) => {
                  const colors =
                    statusColors[layout.task.status || "à faire"] || statusColors["à faire"];
                  const isBeingDragged = draggingTask?.task.id === layout.task.id;

                  return (
                    <div
                      key={layout.task.id}
                      onMouseDown={(e) => handleTaskMouseDown(e, layout)}
                      onDoubleClick={() => {
                        setTaskModalMode("edit");
                        setEditingTask(layout.task);
                        setShowTaskModal(true);
                      }}
                      onMouseEnter={(e) => {
                        if (!isDragging) {
                          setHoveredTask(layout.task.id);
                          setTooltipPos({ x: e.clientX, y: e.clientY });
                        }
                      }}
                      onMouseLeave={() => {
                        if (!isDragging) {
                          setHoveredTask(null);
                          setTooltipPos(null);
                        }
                      }}
                      onMouseMove={(e) => {
                        if (hoveredTask === layout.task.id && !isDragging) {
                          setTooltipPos({ x: e.clientX, y: e.clientY });
                        }
                      }}
                      style={{
                        position: "absolute",
                        left: layout.startPos,
                        top: layout.row * ROW_HEIGHT + 10,
                        width: layout.width,
                        height: "52px",
                        background: colors.bg,
                        border: `2px solid ${colors.border}`,
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        padding: "0 14px",
                        cursor: isBeingDragged ? "grabbing" : "grab",
                        boxShadow:
                          hoveredTask === layout.task.id || isBeingDragged
                            ? colors.shadow + ", 0 8px 24px rgba(0,0,0,0.15)"
                            : colors.shadow,
                        opacity: isBeingDragged ? 0.8 : 1,
                        transform: isBeingDragged
                          ? "scale(1.03)"
                          : hoveredTask === layout.task.id
                            ? "scale(1.01)"
                            : "scale(1)",
                        transition: isBeingDragged
                          ? "none"
                          : "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        zIndex: isBeingDragged ? 100 : hoveredTask === layout.task.id ? 50 : 1,
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            width: "6px",
                            height: "32px",
                            borderRadius: "3px",
                            background: colors.border,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "0.9rem",
                              fontWeight: 700,
                              color: colors.text,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              marginBottom: "2px",
                            }}
                          >
                            {layout.task.title}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              fontSize: "0.7rem",
                              color: colors.text,
                              opacity: 0.7,
                            }}
                          >
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <Clock size={11} />
                              {layout.duration}j
                            </span>
                            {layout.task.assigned_to && layout.task.assigned_to.length > 0 && (
                              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <User size={11} />
                                {layout.task.assigned_to.length}
                              </span>
                            )}
                          </div>
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

      {/* Enhanced tooltip */}
      {tooltipPos && hoveredTask && !isDragging && (
        <div
          style={{
            position: "fixed",
            left: tooltipPos.x + 15,
            top: tooltipPos.y - 15,
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: "12px",
            padding: "16px 18px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
            zIndex: 1000,
            pointerEvents: "none",
            minWidth: "280px",
            maxWidth: "380px",
          }}
        >
          {(() => {
            const task = tasks.find((t) => t.id === hoveredTask);
            if (!task) return null;
            const layout = taskLayouts.find((l) => l.task.id === hoveredTask);
            const colors = statusColors[task.status || "à faire"] || statusColors["à faire"];
            return (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "4px",
                      height: "40px",
                      borderRadius: "2px",
                      background: colors.border,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#888",
                        marginBottom: "4px",
                      }}
                    >
                      Tâche
                    </div>
                    <div
                      style={{
                        fontSize: "1.05rem",
                        fontWeight: 700,
                        color: "#1A1A1A",
                        lineHeight: 1.3,
                      }}
                    >
                      {task.title}
                    </div>
                  </div>
                </div>
                {task.description && (
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "#666",
                      marginBottom: "12px",
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
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
                    gap: "8px",
                    fontSize: "0.8rem",
                    borderTop: "1px solid rgba(0,0,0,0.06)",
                    paddingTop: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{ color: "#888", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: colors.border,
                        }}
                      />
                      Statut
                    </span>
                    <span
                      style={{ fontWeight: 700, color: colors.text, textTransform: "capitalize" }}
                    >
                      {task.status}
                    </span>
                  </div>
                  {task.priority && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#888" }}>Priorité</span>
                      <span
                        style={{
                          fontWeight: 700,
                          color:
                            task.priority === "high"
                              ? "#dc2626"
                              : task.priority === "medium"
                                ? "#f59e0b"
                                : "#10b981",
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
                  {layout && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#888" }}>Durée</span>
                      <span style={{ fontWeight: 700, color: "#1A1A1A" }}>
                        {layout.duration} jour{layout.duration > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                  {task.start_date && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#888" }}>Début</span>
                      <span style={{ fontWeight: 600, color: "#1A1A1A" }}>
                        {new Date(task.start_date).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
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
