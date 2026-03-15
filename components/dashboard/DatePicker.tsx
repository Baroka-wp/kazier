"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type Props = {
  value: string; // Format: "YYYY-MM-DD HH:mm"
  onChange: (value: string) => void;
  placeholder?: string;
};

function parseDateTime(dateTimeStr: string): {
  date: string;
  hour: string;
  minute: string;
} {
  if (!dateTimeStr) return { date: "", hour: "00", minute: "00" };
  try {
    const parts = dateTimeStr.split(/[\s T]/);
    const date = parts[0] || "";
    const time = parts[1] || "00:00";
    const [hour, minute] = time.split(":").map((s) => s.padStart(2, "0"));
    return { date, hour: hour || "00", minute: minute || "00" };
  } catch {
    return { date: "", hour: "00", minute: "00" };
  }
}

function formatDateTimeValue(date: string, hour: string, minute: string): string {
  if (!date) return "";
  return `${date} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// ✅ Parse YYYY-MM-DD localement sans passer par UTC
function parseDateLocal(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day); // Constructeur local, pas UTC
}

// ✅ Affiche date + heure dans l'input
function formatDisplayLabel(date: string, hour: string, minute: string): string {
  if (!date) return "";
  const d = parseDateLocal(date);
  if (!d) return "";
  const dateLabel = d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${dateLabel} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export default function DatePicker({ value, onChange, placeholder }: Props) {
  const { date, hour, minute } = parseDateTime(value);

  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(date);
  const [selectedHour, setSelectedHour] = useState(hour);
  const [selectedMinute, setSelectedMinute] = useState(minute);

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(
    date ? parseInt(date.split("-")[1]) - 1 : today.getMonth()
  );
  const [currentYear, setCurrentYear] = useState(
    date ? parseInt(date.split("-")[0]) : today.getFullYear()
  );
  const [hovered, setHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync state when value prop changes externally
  useEffect(() => {
    const parsed = parseDateTime(value);
    const newDate = parsed.date;
    const newHour = parsed.hour;
    const newMinute = parsed.minute;

    // Update state in a batch to avoid cascading renders
    Promise.resolve().then(() => {
      if (newDate !== selectedDate) setSelectedDate(newDate);
      if (newHour !== selectedHour) setSelectedHour(newHour);
      if (newMinute !== selectedMinute) setSelectedMinute(newMinute);
    });
  }, [value, selectedDate, selectedHour, selectedMinute]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowCalendar(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleDateSelect(day: number) {
    const newDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(newDate);

    // Utiliser l'heure actuelle par défaut si aucune heure n'est sélectionnée
    const now = new Date();
    const defaultHour =
      selectedHour === "00" && selectedMinute === "00"
        ? String(now.getHours()).padStart(2, "0")
        : selectedHour;
    const defaultMinute =
      selectedHour === "00" && selectedMinute === "00"
        ? String(now.getMinutes()).padStart(2, "0")
        : selectedMinute;

    // Auto-confirm avec l'heure
    const newDateTime = formatDateTimeValue(newDate, defaultHour, defaultMinute);
    onChange(newDateTime);
    setShowCalendar(false);
  }

  function handleConfirm() {
    const newValue = formatDateTimeValue(selectedDate, selectedHour, selectedMinute);
    onChange(newValue);
    setShowCalendar(false);
  }

  function handleClear() {
    onChange("");
    setSelectedDate("");
    setSelectedHour("00");
    setSelectedMinute("00");
    setShowCalendar(false);
  }

  function handleToday() {
    const now = new Date();
    const newDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const nowHour = String(now.getHours()).padStart(2, "0");
    const nowMinute = String(now.getMinutes()).padStart(2, "0");
    setSelectedDate(newDate);
    setSelectedHour(nowHour);
    setSelectedMinute(nowMinute);
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const calendarDays: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // ✅ Affiche date ET heure dans l'input
  const displayLabel = formatDisplayLabel(selectedDate, selectedHour, selectedMinute);

  const selectStyle = {
    width: "100%",
    padding: "6px 8px",
    borderRadius: "8px",
    border: "1px solid rgba(0,0,0,0.1)",
    background: "#F5F2ED",
    fontSize: "0.8rem",
    fontFamily: "'DM Sans', sans-serif",
    color: "#1A1A1A",
    outline: "none",
    cursor: "pointer",
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Input trigger */}
      <div
        onClick={() => setShowCalendar(!showCalendar)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 10px",
          borderRadius: "10px",
          border: "1.5px solid rgba(0,0,0,0.08)",
          background: "#F5F2ED",
          fontSize: "0.82rem",
          fontFamily: "'DM Sans', sans-serif",
          color: selectedDate ? "#1A1A1A" : "#aaa",
          cursor: "pointer",
          transition: "all 0.15s",
          minHeight: "36px",
        }}
      >
        {/* ✅ Affiche "25 mar. 2026 18:30" au lieu de juste la date */}
        <span>{displayLabel || placeholder || "Sélectionner date et heure"}</span>
        {selectedDate && hovered && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#999",
              padding: "0",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Calendar Popup */}
      {showCalendar && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: "0",
            marginBottom: "8px",
            zIndex: 1000,
            background: "#fff",
            borderRadius: "12px",
            border: "1px solid rgba(0,0,0,0.1)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            padding: "16px",
            minWidth: "320px",
          }}
        >
          {/* Month Navigation */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <button
              onClick={() => {
                if (currentMonth === 0) {
                  setCurrentMonth(11);
                  setCurrentYear(currentYear - 1);
                } else setCurrentMonth(currentMonth - 1);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#666",
                padding: "4px",
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1A1A1A" }}>
              {new Date(currentYear, currentMonth).toLocaleDateString("fr-FR", {
                month: "long",
                year: "numeric",
              })}
            </span>
            <button
              onClick={() => {
                if (currentMonth === 11) {
                  setCurrentMonth(0);
                  setCurrentYear(currentYear + 1);
                } else setCurrentMonth(currentMonth + 1);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#666",
                padding: "4px",
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Calendar Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "4px",
              marginBottom: "16px",
            }}
          >
            {["D", "L", "M", "M", "J", "V", "S"].map((d, idx) => (
              <div
                key={`h-${idx}`}
                style={{
                  textAlign: "center",
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  color: "#999",
                  padding: "4px 0",
                }}
              >
                {d}
              </div>
            ))}
            {calendarDays.map((day, idx) => {
              const isSelected =
                day &&
                selectedDate ===
                  `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              return (
                <div
                  key={idx}
                  onClick={() => day && handleDateSelect(day)}
                  style={{
                    textAlign: "center",
                    padding: "6px",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    fontWeight: day ? 500 : 400,
                    color: isSelected ? "#6B1A2A" : day ? "#1A1A1A" : "#ddd",
                    background: isSelected ? "rgba(107,26,42,0.15)" : "transparent",
                    cursor: day ? "pointer" : "default",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (day && !isSelected)
                      (e.currentTarget as HTMLElement).style.background = "rgba(107,26,42,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    if (day && !isSelected)
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  {day}
                </div>
              );
            })}
          </div>

          {/* Time Selectors */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  color: "#999",
                  marginBottom: "4px",
                  textTransform: "uppercase" as const,
                }}
              >
                Heure
              </label>
              <select
                value={selectedHour}
                onChange={(e) => setSelectedHour(e.target.value)}
                style={selectStyle}
              >
                {Array.from({ length: 24 }, (_, i) => {
                  const h = String(i).padStart(2, "0");
                  return (
                    <option key={h} value={h}>
                      {h}h
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  color: "#999",
                  marginBottom: "4px",
                  textTransform: "uppercase" as const,
                }}
              >
                Minute
              </label>
              <select
                value={selectedMinute}
                onChange={(e) => setSelectedMinute(e.target.value)}
                style={selectStyle}
              >
                {Array.from({ length: 60 }, (_, i) => {
                  const m = String(i).padStart(2, "0");
                  return (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* ✅ Aperçu date + heure en temps réel */}
          {selectedDate && (
            <div
              style={{
                textAlign: "center",
                fontSize: "0.75rem",
                color: "#6B1A2A",
                fontWeight: 600,
                marginBottom: "12px",
                padding: "6px",
                background: "rgba(107,26,42,0.05)",
                borderRadius: "8px",
              }}
            >
              {formatDisplayLabel(selectedDate, selectedHour, selectedMinute)}
            </div>
          )}

          {/* Shortcuts */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
            <button
              onClick={handleToday}
              style={{
                flex: 1,
                padding: "6px 10px",
                borderRadius: "8px",
                border: "1px solid rgba(107,26,42,0.2)",
                background: "rgba(107,26,42,0.05)",
                color: "#6B1A2A",
                fontSize: "0.7rem",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Maintenant
            </button>
            <button
              onClick={() => {
                setSelectedHour("18");
                setSelectedMinute("00");
              }}
              style={{
                flex: 1,
                padding: "6px 10px",
                borderRadius: "8px",
                border: "1px solid rgba(107,26,42,0.2)",
                background: "rgba(107,26,42,0.05)",
                color: "#6B1A2A",
                fontSize: "0.7rem",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              18:00
            </button>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setShowCalendar(false)}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "8px",
                border: "1px solid rgba(0,0,0,0.08)",
                background: "#F5F2ED",
                color: "#666",
                fontSize: "0.8rem",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "8px",
                border: "none",
                background: "#6B1A2A",
                color: "white",
                fontSize: "0.8rem",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Confirmer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
