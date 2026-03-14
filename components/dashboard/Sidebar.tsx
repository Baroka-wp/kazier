"use client";

import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { usePermissions } from "@/hooks/usePermissions";
import { CheckSquare, LayoutDashboard, FileText, Users, Briefcase, Users2, ChevronLeft, ChevronRight, Menu, KeyRound, Eye, EyeOff, X, Check } from "lucide-react";
import { changePassword } from "@/lib/auth-actions";

type NavItem = {
  id: string;
  label: string;
  icon: ReactNode;
  href: string;
  requiredPermission?: keyof ReturnType<typeof usePermissions>;
};

const NAV_ITEMS: NavItem[] = [
  { id: "rapports", label: "Rapports",  icon: <FileText size={16} />,      href: "/dashboard/rapports",  requiredPermission: "canViewReports" },
  { id: "equipe",   label: "Équipe",    icon: <Users size={16} />,         href: "/dashboard/equipe",    requiredPermission: "canViewTeam"    },
  { id: "projets",  label: "Projets",   icon: <Briefcase size={16} />,     href: "/dashboard/projects",  requiredPermission: "canViewTeam"    },
  { id: "tasks",    label: "Tâches",    icon: <CheckSquare size={16} />,   href: "/dashboard/tasks",     requiredPermission: "canViewTeam"    },
  { id: "teams",    label: "Team",      icon: <Users2 size={16} />,        href: "/dashboard/teams",     requiredPermission: "isTeam"         },
];

// ── Modale changement de mot de passe ─────────────────────────────────────────

function ChangePasswordModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [showPwd, setShowPwd]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState(false);

  const passwordMatch = confirm.length === 0 || password === confirm;
  const isValid       = password.length >= 8 && password === confirm;

  // Barre de force : 1 = faible (<8), 2 = moyen (>=8), 3 = fort (>=12 + chiffre/spécial)
  const strength = password.length === 0 ? 0
    : password.length < 8 ? 1
    : password.length >= 12 && /[\d\W]/.test(password) ? 3
    : 2;
  const strengthColor = ["transparent", "#EF4444", "#F59E0B", "#22C55E"][strength];
  const strengthLabel = ["", "Faible", "Moyen", "Fort"][strength];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError(null);
    const result = await changePassword(userId, password);
    setLoading(false);
    if (!result.success) { setError(result.error ?? "Une erreur est survenue."); return; }
    setSuccess(true);
    setTimeout(onClose, 1800);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: "20px",
          width: "100%", maxWidth: "380px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.15)",
          overflow: "hidden",
          animation: "popIn 0.2s ease",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "24px 24px 0",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "42px", height: "42px", borderRadius: "12px",
              background: "rgba(107,26,42,0.07)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <KeyRound size={20} color="#6B1A2A" />
            </div>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1A1A1A", margin: 0 }}>
                Modifier le mot de passe
              </h3>
              <p style={{ fontSize: "0.75rem", color: "#aaa", margin: "2px 0 0" }}>
                Choisissez un mot de passe sécurisé
              </p>
            </div>
          </div>
          <button
            type="button" onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", padding: "4px", borderRadius: "8px" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Succès */}
        {success ? (
          <div style={{ padding: "32px 24px", textAlign: "center" }}>
            <div style={{
              width: "52px", height: "52px", borderRadius: "50%",
              background: "rgba(34,197,94,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 12px",
            }}>
              <Check size={24} color="#22C55E" />
            </div>
            <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1A1A1A", margin: 0 }}>
              Mot de passe mis à jour !
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* Nouveau mot de passe */}
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#555", display: "block", marginBottom: "6px" }}>
                Nouveau mot de passe
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  style={{
                    width: "100%", padding: "10px 40px 10px 14px",
                    borderRadius: "12px", boxSizing: "border-box",
                    border: "1.5px solid rgba(0,0,0,0.1)",
                    fontSize: "14px", outline: "none",
                    background: "rgba(0,0,0,0.02)",
                    transition: "border-color 0.15s",
                    color: "#1A1A1A",
                  }}
                  onFocus={e => e.target.style.borderColor = "#6B1A2A"}
                  onBlur={e => e.target.style.borderColor = "rgba(0,0,0,0.1)"}
                />
                <button
                  type="button" onClick={() => setShowPwd(v => !v)}
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#aaa", padding: 0 }}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Barre de force */}
              {password.length > 0 && (
                <div style={{ marginTop: "8px" }}>
                  <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{
                        flex: 1, height: "3px", borderRadius: "2px",
                        background: strength >= i ? strengthColor : "rgba(0,0,0,0.08)",
                        transition: "background 0.2s",
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: "11px", color: strengthColor, fontWeight: 600 }}>{strengthLabel}</span>
                </div>
              )}
            </div>

            {/* Confirmation */}
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#555", display: "block", marginBottom: "6px" }}>
                Confirmer le mot de passe
              </label>
              <input
                type={showPwd ? "text" : "password"}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%", padding: "10px 14px",
                  borderRadius: "12px", boxSizing: "border-box",
                  border: `1.5px solid ${confirm.length > 0 && !passwordMatch ? "#EF4444" : "rgba(0,0,0,0.1)"}`,
                  fontSize: "14px", outline: "none",
                  background: "rgba(0,0,0,0.02)",
                  transition: "border-color 0.15s",
                  color: "#1A1A1A",
                }}
                onFocus={e => { if (passwordMatch) e.target.style.borderColor = "#6B1A2A"; }}
                onBlur={e => { e.target.style.borderColor = confirm.length > 0 && !passwordMatch ? "#EF4444" : "rgba(0,0,0,0.1)"; }}
              />
              {confirm.length > 0 && !passwordMatch && (
                <p style={{ fontSize: "11px", color: "#EF4444", marginTop: "4px" }}>
                  Les mots de passe ne correspondent pas.
                </p>
              )}
            </div>

            {error && (
              <p style={{ fontSize: "12px", color: "#6B1A2A", background: "rgba(107,26,42,0.06)", border: "1px solid rgba(107,26,42,0.15)", borderRadius: "10px", padding: "10px 14px", margin: 0 }}>
                ⛔ {error}
              </p>
            )}

            {/* Boutons */}
            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button
                type="button" onClick={onClose} disabled={loading}
                style={{
                  flex: 1, padding: "11px", borderRadius: "12px",
                  border: "1.5px solid rgba(0,0,0,0.08)",
                  background: "#F5F2ED", color: "#666",
                  fontSize: "13px", fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Annuler
              </button>
              <button
                type="submit" disabled={loading || !isValid}
                style={{
                  flex: 1, padding: "11px", borderRadius: "12px",
                  border: "none",
                  background: loading || !isValid ? "rgba(107,26,42,0.4)" : "#6B1A2A",
                  color: "white",
                  fontSize: "13px", fontWeight: 600,
                  cursor: loading || !isValid ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                }}
              >
                {loading ? (
                  <>
                    <span style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                    Enregistrement...
                  </>
                ) : "Enregistrer"}
              </button>
            </div>
          </form>
        )}
      </div>
      <style>{`
        @keyframes popIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        @keyframes spin   { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const [collapsed, setCollapsed]           = useState(false);
  const [isMobile, setIsMobile]             = useState(false);
  const [mobileOpen, setMobileOpen]         = useState(false);
  const [showChangePwd, setShowChangePwd]   = useState(false);
  const pathname    = usePathname();
  const { data: session } = useSession();
  const permissions = usePermissions();

  const firstName = (session?.user as any)?.first_name ?? "";
  const lastName  = (session?.user as any)?.last_name  ?? "";
  const userRole  = (session?.user as any)?.role       ?? "";
  const userId    = (session?.user as any)?.id         ?? "";
  const initials  = session
    ? `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "?"
    : "";
  const userName  = `${firstName} ${lastName}`.trim() || "Utilisateur";

  useEffect(() => {
    function check() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) { setCollapsed(true); setMobileOpen(false); }
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [pathname, isMobile]);

  const isOpen = isMobile ? mobileOpen : !collapsed;

  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (!item.requiredPermission) return true;
    return permissions[item.requiredPermission as keyof typeof permissions] === true;
  });

  const getRoleLabel = (role: string) => ({ SA: "Super Admin", TM: "Team Manager", T: "Team" }[role] ?? role);

  return (
    <>
      {isMobile && !mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          style={{
            position: "fixed", top: "60px", left: "12px", zIndex: 45,
            width: "36px", height: "36px", borderRadius: "10px",
            background: "#FFFFFF", border: "1.5px solid rgba(107,26,42,0.15)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#6B1A2A", transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#6B1A2A"; e.currentTarget.style.color = "white"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#FFFFFF"; e.currentTarget.style.color = "#6B1A2A"; }}
        >
          <Menu size={18} strokeWidth={2} />
        </button>
      )}

      {isMobile && mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 40, backdropFilter: "blur(2px)" }} />
      )}

      <aside style={{
        width: isOpen ? "260px" : "64px", minWidth: isOpen ? "260px" : "64px",
        transition: "width 0.25s ease, min-width 0.25s ease, transform 0.25s ease",
        background: "#FFFFFF", borderRight: "1px solid rgba(0,0,0,0.07)",
        display: "flex", flexDirection: "column", height: "100vh",
        position: isMobile ? "fixed" : "sticky", top: 0, left: 0,
        overflow: "visible", zIndex: isMobile ? 50 : 20, flexShrink: 0,
        transform: isMobile && !mobileOpen ? "translateX(-100%)" : "translateX(0)",
        boxShadow: isMobile && mobileOpen ? "4px 0 24px rgba(0,0,0,0.15)" : "none",
      }}>

        {/* Logo */}
        <div style={{
          padding: isOpen ? "24px 20px" : "24px 0",
          borderBottom: "1px solid rgba(0,0,0,0.06)", marginBottom: "16px",
          display: "flex", alignItems: "center", justifyContent: isOpen ? "flex-start" : "center",
          gap: "12px", minHeight: "80px", overflow: "hidden",
        }}>
          <div style={{ flexShrink: 0 }}>
            <Image src="/icon.png" alt="Africa Samurai" width={36} height={36} style={{ borderRadius: "10px", display: "block" }} />
          </div>
          {isOpen && (
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.1rem", color: "#1A1A1A", whiteSpace: "nowrap", fontWeight: 400, lineHeight: 1.2 }}>
                Africa Samurai
              </div>
              <div style={{ fontSize: "0.65rem", color: "#999", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: "4px" }}>
                Tableau de bord
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ padding: isOpen ? "0 16px" : "0 8px", flex: 1 }}>
          {isOpen && (
            <div style={{ fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#bbb", padding: "0 12px", marginBottom: "8px" }}>
              Principal
            </div>
          )}
          {visibleNavItems.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.id} href={item.href} title={!isOpen ? item.label : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: isOpen ? "12px" : 0,
                  justifyContent: isOpen ? "flex-start" : "center",
                  padding: isOpen ? "12px 12px" : "12px 0",
                  borderRadius: "12px", marginBottom: "4px", textDecoration: "none",
                  fontSize: "0.9rem", fontWeight: isActive ? 600 : 400,
                  color: isActive ? "#6B1A2A" : "#666",
                  background: isActive ? "rgba(107,26,42,0.07)" : "transparent",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(107,26,42,0.04)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ width: "20px", display: "flex", justifyContent: "center", flexShrink: 0, color: isActive ? "#6B1A2A" : "#888" }}>
                  {item.icon}
                </span>
                {isOpen && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User chip — cliquable pour changer le mot de passe */}
        <div style={{ padding: isOpen ? "20px 16px" : "20px 8px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <button
            type="button"
            onClick={() => setShowChangePwd(true)}
            title="Modifier le mot de passe"
            style={{
              width: "100%",
              display: "flex", alignItems: "center", gap: isOpen ? "12px" : 0,
              justifyContent: isOpen ? "flex-start" : "center",
              padding: isOpen ? "8px 12px" : "8px 0",
              borderRadius: "12px", background: "rgba(107,26,42,0.04)",
              border: "none", cursor: "pointer", fontFamily: "inherit",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(107,26,42,0.09)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(107,26,42,0.04)"}
          >
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: "#6B1A2A", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.75rem", fontWeight: 700, color: "white", flexShrink: 0,
            }}>
              {initials}
            </div>
            {isOpen && (
              <div style={{ overflow: "hidden", minWidth: 0, flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1A1A1A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {userName}
                </div>
                <div style={{ fontSize: "0.7rem", color: "#999", whiteSpace: "nowrap" }}>
                  {getRoleLabel(userRole)}
                </div>
              </div>
            )}
            {isOpen && <KeyRound size={14} color="#bbb" style={{ flexShrink: 0 }} />}
          </button>
        </div>

        {/* Toggle desktop */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Ouvrir" : "Réduire"}
            style={{
              position: "absolute", top: "60px", right: "-14px",
              width: "28px", height: "28px", borderRadius: "50%",
              background: "#FFFFFF", border: "1.5px solid rgba(107,26,42,0.2)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#6B1A2A", transition: "all 0.15s", zIndex: 30,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#6B1A2A"; e.currentTarget.style.color = "white"; e.currentTarget.style.borderColor = "#6B1A2A"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#FFFFFF"; e.currentTarget.style.color = "#6B1A2A"; e.currentTarget.style.borderColor = "rgba(107,26,42,0.2)"; }}
          >
            {collapsed ? <ChevronRight size={14} strokeWidth={2.5} /> : <ChevronLeft size={14} strokeWidth={2.5} />}
          </button>
        )}
      </aside>

      {/* Modale changement mot de passe */}
      {showChangePwd && userId && (
        <ChangePasswordModal userId={userId} onClose={() => setShowChangePwd(false)} />
      )}
    </>
  );
}
