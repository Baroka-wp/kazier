"use client";

import { X } from "lucide-react";
import { useState } from "react";

type Props = {
  value: string; // Format: "YYYY-MM-DD HH:mm"
  onChange: (value: string) => void;
  placeholder?: string;
};

/**
 * Convertit "YYYY-MM-DD HH:mm" en "YYYY-MM-DDTHH:mm" pour datetime-local
 */
function toDateTimeLocal(value: string): string {
  if (!value) return "";
  // "2025-03-15 18:30" -> "2025-03-15T18:30"
  return value.replace(" ", "T");
}

/**
 * Convertit "YYYY-MM-DDTHH:mm" en "YYYY-MM-DD HH:mm" pour notre format
 */
function fromDateTimeLocal(value: string): string {
  if (!value) return "";
  // "2025-03-15T18:30" -> "2025-03-15 18:30"
  return value.replace("T", " ");
}

export default function DateTimeInput({ value, onChange, placeholder }: Props) {
  const [hovered, setHovered] = useState(false);

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange("");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = fromDateTimeLocal(e.target.value);
    onChange(newValue);
  };

  const inputValue = toDateTimeLocal(value);

  return (
    <div
      style={{ position: "relative", display: "flex", alignItems: "center" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <input
        type="datetime-local"
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "8px 10px",
          paddingRight: value && hovered ? "32px" : "10px",
          borderRadius: "10px",
          border: "1.5px solid rgba(0,0,0,0.08)",
          background: "#F5F2ED",
          fontSize: "0.82rem",
          fontFamily: "'DM Sans', sans-serif",
          color: "#1A1A1A",
          outline: "none",
          transition: "all 0.15s",
        }}
      />
      {value && hovered && (
        <button
          onClick={handleClear}
          type="button"
          style={{
            position: "absolute",
            right: "8px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#999",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "4px",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(0,0,0,0.05)";
            e.currentTarget.style.color = "#666";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
            e.currentTarget.style.color = "#999";
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
