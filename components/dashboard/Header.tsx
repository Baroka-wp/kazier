"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LogOut, X, Menu } from "lucide-react";

// ── Config titres par route ───────────────────────────────────────────────────

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Vue générale",
    subtitle: "Bonjour, voici le résumé du jour",
  },
  "/dashboard/rapports": {
    title: "Rapports",
    subtitle: "Historique et suivi des rapports quotidiens",
  },
  "/dashboard/equipe": {
    title: "Équipe",
    subtitle: "Gestion des membres et leurs informations",
  },
  "/dashboard/projects": {
    title: "Projets",
    subtitle: "Gestion des projets en cours",
  },
  "/dashboard/tasks": {
    title: "Tâches",
    subtitle: "Gestion des tâches en cours",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFormattedDate(): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Modale confirmation déconnexion ───────────────────────────────────────────

function LogoutModal({
  userName,
  initials,
  onConfirm,
  onCancel,
  loading,
}: {
  userName: string;
  initials: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
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
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "380px",
          margin: "16px",
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,0.15)",
          animation: "popIn 0.2s ease",
        }}
      >
        <div
          style={{
            padding: "28px 20px 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          {/* Icône */}
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background: "rgba(107,26,42,0.07)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
            }}
          >
            <LogOut size={22} color="#6B1A2A" />
          </div>

          <h3
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "#1A1A1A",
              marginBottom: "6px",
            }}
          >
            Se déconnecter ?
          </h3>
          <p style={{ fontSize: "0.9rem", color: "#aaa", marginBottom: "20px" }}>
            Vous serez redirigé vers la page de connexion.
          </p>

          {/* Info utilisateur */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: "#e8eaed",
              borderRadius: "12px",
              padding: "12px 16px",
              width: "100%",
              marginBottom: "4px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "#6B1A2A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "white",
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ textAlign: "left", minWidth: 0 }}>
              <div
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "#1A1A1A",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {userName}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#aaa" }}>Session active</div>
            </div>
          </div>
        </div>

        {/* Boutons */}
        <div style={{ display: "flex", gap: "12px", padding: "24px 20px 28px" }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1,
              padding: "12px 8px",
              borderRadius: "12px",
              border: "1.5px solid rgba(0,0,0,0.08)",
              background: "#e8eaed",
              color: "#666",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.15s",
            }}
          >
            <X size={16} /> Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1,
              padding: "12px 8px",
              borderRadius: "12px",
              border: "none",
              background: loading ? "rgba(107,26,42,0.4)" : "#6B1A2A",
              color: "white",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.15s",
            }}
          >
            <LogOut size={16} />
            {loading ? "Déconnexion..." : "Se déconnecter"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

export default function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Détection mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const page = PAGE_TITLES[pathname] ?? { title: "Dashboard", subtitle: "" };
  const date = capitalize(getFormattedDate());
  const userName = session?.user?.name ?? "";
  const userRole = (session?.user as { role?: string })?.role ?? "";
  const initials = session
    ? userName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join("") || "?"
    : "";

  async function handleLogout() {
    setLoggingOut(true);
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <>
      <header
        style={{
          background: "#FFFFFF",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          padding: isMobile ? "0 16px" : "0 32px",
          height: isMobile ? "56px" : "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          position: "sticky",
          top: 0,
          zIndex: 10,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* ── Left : titre + sous-titre ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1px",
            maxWidth: isMobile ? "140px" : "none",
          }}
        >
          <h1
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: isMobile ? "1rem" : "1.2rem",
              color: "#1A1A1A",
              fontWeight: 400,
              lineHeight: 1.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {page.title}
          </h1>
          {page.subtitle && !isMobile && (
            <p style={{ fontSize: "0.7rem", color: "#aaa", fontWeight: 400 }}>{page.subtitle}</p>
          )}
        </div>

        {/* ── Right ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? "8px" : "10px",
          }}
        >
          {/* Date pill - version simplifiée sur mobile */}
          <div
            style={{
              fontSize: isMobile ? "0.65rem" : "0.72rem",
              color: "#888",
              background: "#e8eaed",
              padding: isMobile ? "4px 8px" : "6px 14px",
              borderRadius: "20px",
              border: "1px solid rgba(0,0,0,0.07)",
              whiteSpace: "nowrap",
            }}
          >
            📅 {isMobile ? date.split(" ")[0] : date}
          </div>

          {/* Bouton déconnexion - caché sur mobile (dans le menu) */}
          {!isMobile && (
            <button
              type="button"
              onClick={() => setShowLogout(true)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(107,26,42,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(107,26,42,0.04)";
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "999px",
                border: "1px solid rgba(107,26,42,0.15)",
                background: "rgba(107,26,42,0.04)",
                color: "#6B1A2A",
                fontSize: "0.72rem",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: "'DM Sans', sans-serif",
              }}
              title="Se déconnecter"
            >
              <LogOut size={14} />
              <span>Déconnexion</span>
            </button>
          )}

          {/* Menu mobile */}
          {isMobile && (
            <>
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: showMobileMenu ? "rgba(107,26,42,0.1)" : "#e8eaed",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <Menu size={18} color={showMobileMenu ? "#6B1A2A" : "#666"} />
              </button>

              {/* Menu déroulant mobile */}
              {showMobileMenu && (
                <div
                  style={{
                    position: "absolute",
                    top: "56px",
                    right: "16px",
                    background: "#FFFFFF",
                    borderRadius: "12px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                    padding: "8px",
                    minWidth: "180px",
                    zIndex: 20,
                    border: "1px solid rgba(0,0,0,0.07)",
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid rgba(0,0,0,0.07)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        color: "#1A1A1A",
                      }}
                    >
                      {userName}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#aaa" }}>{userRole}</div>
                  </div>
                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      setShowLogout(true);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      width: "100%",
                      padding: "12px 16px",
                      border: "none",
                      background: "none",
                      color: "#6B1A2A",
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      borderRadius: "8px",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(107,26,42,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "none";
                    }}
                  >
                    <LogOut size={18} />
                    <span>Déconnexion</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Avatar */}
          <div
            title={`${userName} — ${userRole}`}
            style={{
              width: isMobile ? "32px" : "36px",
              height: isMobile ? "32px" : "36px",
              borderRadius: "50%",
              background: "#6B1A2A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: isMobile ? "0.65rem" : "0.7rem",
              fontWeight: 700,
              color: "white",
              border: "2px solid rgba(107,26,42,0.2)",
              flexShrink: 0,
              cursor: "default",
            }}
          >
            {initials}
          </div>
        </div>
      </header>

      {/* Modale déconnexion */}
      {showLogout && (
        <LogoutModal
          userName={userName}
          initials={initials}
          onConfirm={handleLogout}
          onCancel={() => !loggingOut && setShowLogout(false)}
          loading={loggingOut}
        />
      )}
    </>
  );
}
