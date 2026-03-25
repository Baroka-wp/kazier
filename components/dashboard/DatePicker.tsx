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

// ✅ Vérifie si une date est antérieure à aujourd'hui (sans heure)
function isPastDate(year: number, month: number, day: number): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const compareDate = new Date(year, month, day);
  compareDate.setHours(0, 0, 0, 0);

  return compareDate < today;
}

// ✅ Vérifie si la date+heure sélectionnée est antérieure à maintenant
function isPastDateTime(dateStr: string, hour: string, minute: string): boolean {
  if (!dateStr) return false;

  const [year, month, day] = dateStr.split("-").map(Number);
  const selectedDate = new Date(year, month - 1, day, parseInt(hour), parseInt(minute));
  const now = new Date();

  return selectedDate < now;
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
  }

  function handleConfirm() {
    // ✅ Vérifier que la date/heure n'est pas antérieure
    if (isPastDateTime(selectedDate, selectedHour, selectedMinute)) {
      alert("Impossible de sélectionner une date ou une heure antérieure à maintenant");
      return;
    }

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

  const displayLabel = formatDisplayLabel(selectedDate, selectedHour, selectedMinute);

  // ✅ Vérifier si l'heure sélectionnée est valide (pas antérieure pour la date du jour)
  const isSelectedDateTimeValid =
    selectedDate && !isPastDateTime(selectedDate, selectedHour, selectedMinute);

  // ✅ Générer les options d'heures disponibles pour la date sélectionnée
  const getAvailableHours = () => {
    if (!selectedDate) return Array.from({ length: 24 }, (_, i) => i);

    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Si la date sélectionnée est aujourd'hui, limiter les heures à partir de l'heure actuelle
    if (selectedDate === todayStr) {
      const currentHour = today.getHours();
      return Array.from({ length: 24 - currentHour }, (_, i) => currentHour + i);
    }

    // Sinon, toutes les heures sont disponibles
    return Array.from({ length: 24 }, (_, i) => i);
  };

  // ✅ Générer les options de minutes disponibles pour l'heure sélectionnée
  const getAvailableMinutes = (hour: string) => {
    if (!selectedDate) return Array.from({ length: 60 }, (_, i) => i);

    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();

    // Si la date est aujourd'hui et l'heure est l'heure actuelle, limiter les minutes
    if (selectedDate === todayStr && parseInt(hour) === currentHour) {
      return Array.from({ length: 60 - currentMinute }, (_, i) => currentMinute + i);
    }

    // Sinon, toutes les minutes sont disponibles
    return Array.from({ length: 60 }, (_, i) => i);
  };

  const availableHours = getAvailableHours();
  const availableMinutes = getAvailableMinutes(selectedHour);

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
              // ✅ Désactiver si on est sur un mois antérieur à aujourd'hui
              disabled={currentYear === today.getFullYear() && currentMonth === today.getMonth()}
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
              const isPast = day && isPastDate(currentYear, currentMonth, day);
              const isSelected =
                day &&
                selectedDate ===
                  `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (day && !isPast) {
                      handleDateSelect(day);
                    }
                  }}
                  style={{
                    textAlign: "center",
                    padding: "6px",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    fontWeight: day ? 500 : 400,
                    color: isSelected ? "#6B1A2A" : isPast ? "#ccc" : day ? "#1A1A1A" : "#ddd",
                    background: isSelected ? "rgba(107,26,42,0.15)" : "transparent",
                    cursor: day && !isPast ? "pointer" : "not-allowed",
                    opacity: isPast ? 0.5 : 1,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (day && !isPast && !isSelected) {
                      (e.currentTarget as HTMLElement).style.background = "rgba(107,26,42,0.08)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (day && !isPast && !isSelected) {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }
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
                disabled={!selectedDate}
              >
                {availableHours.map((h) => {
                  const hourStr = String(h).padStart(2, "0");
                  return (
                    <option key={hourStr} value={hourStr}>
                      {hourStr}h
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
                disabled={!selectedDate}
              >
                {availableMinutes.map((m) => {
                  const minuteStr = String(m).padStart(2, "0");
                  return (
                    <option key={minuteStr} value={minuteStr}>
                      {minuteStr}
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
                color: isSelectedDateTimeValid ? "#6B1A2A" : "#e74c3c",
                fontWeight: 600,
                marginBottom: "12px",
                padding: "6px",
                background: isSelectedDateTimeValid
                  ? "rgba(107,26,42,0.05)"
                  : "rgba(231,76,60,0.05)",
                borderRadius: "8px",
              }}
            >
              {formatDisplayLabel(selectedDate, selectedHour, selectedMinute)}
              {!isSelectedDateTimeValid && selectedDate && (
                <div style={{ fontSize: "0.7rem", marginTop: "4px", color: "#e74c3c" }}>
                  ⚠️ Date ou heure antérieure à maintenant
                </div>
              )}
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
                // ✅ Vérifier que 18:00 n'est pas antérieur
                if (selectedDate && !isPastDateTime(selectedDate, "18", "00")) {
                  setSelectedHour("18");
                  setSelectedMinute("00");
                } else if (!selectedDate) {
                  setSelectedHour("18");
                  setSelectedMinute("00");
                } else {
                  alert("Impossible de sélectionner 18:00 car cette heure est déjà passée");
                }
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
              disabled={selectedDate ? isPastDateTime(selectedDate, "18", "00") : false}
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
                background: isSelectedDateTimeValid ? "#6B1A2A" : "#ccc",
                color: "white",
                fontSize: "0.8rem",
                fontWeight: 500,
                cursor: isSelectedDateTimeValid ? "pointer" : "not-allowed",
                fontFamily: "'DM Sans', sans-serif",
                opacity: isSelectedDateTimeValid ? 1 : 0.6,
              }}
              disabled={!isSelectedDateTimeValid}
            >
              Confirmer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
