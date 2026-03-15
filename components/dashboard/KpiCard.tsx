// ── Types ─────────────────────────────────────────────────────────────────────

type KpiCardProps = {
  label: string;
  value: string;
  delta: string;
  deltaColor?: string;
  icon: React.ReactNode;
  accent?: boolean; // fond brand #6B1A2A
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function KpiCard({
  label,
  value,
  delta,
  deltaColor,
  icon,
  accent = false,
}: KpiCardProps) {
  const bg = accent ? "#6B1A2A" : "#FFFFFF";
  const border = accent ? "#6B1A2A" : "rgba(0,0,0,0.07)";
  const labelColor = accent ? "rgba(255,255,255,0.7)" : "#aaa";
  const valueColor = accent ? "#FFFFFF" : "#1A1A1A";
  const iconOpacity = accent ? 0.24 : 0.18;
  const resolvedDeltaColor = deltaColor ?? (accent ? "rgba(255,255,255,0.72)" : "#6B1A2A");

  return (
    <div
      style={{
        background: bg,
        borderRadius: "16px",
        padding: "20px",
        border: `1px solid ${border}`,
        position: "relative",
        overflow: "hidden",
        boxShadow: accent ? "0 6px 20px -4px rgba(107,26,42,0.3)" : "0 1px 4px rgba(0,0,0,0.04)",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
    >
      {/* Label */}
      <div
        style={{
          fontSize: "0.67rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: labelColor,
          marginBottom: "10px",
        }}
      >
        {label}
      </div>

      {/* Valeur principale */}
      <div
        style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "2.2rem",
          color: valueColor,
          lineHeight: 1,
          marginBottom: "8px",
        }}
      >
        {value}
      </div>

      {/* Delta / sous-texte */}
      <div
        style={{
          fontSize: "0.72rem",
          fontWeight: 500,
          color: resolvedDeltaColor,
          lineHeight: 1.4,
        }}
      >
        {delta}
      </div>

      {/* Icône décorative */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          opacity: iconOpacity,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
