"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Mail,
  Phone,
  Crown,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Eye,
  EyeOff,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TeamMember = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  phone: string | null;
  age: number | null;
  is_boss: boolean;
  slack_id: string | null;
  created_at: string;
  user_id: string | null;
  email: string | null;
  role: string | null;
};

type Props = {
  members: TeamMember[];
  roles: string[];
  loading?: boolean;
  readOnly?: boolean;
  onPageChange?: (page: number) => void;
  onSearch?: (search: string) => void;
  onRefresh?: () => void;
  totalItems?: number;
  totalPages?: number;
  currentPage?: number;
  roleFilter?: string;
  onRoleFilter?: (role: string) => void;
};

// ── Helper Functions ──────────────────────────────────────────────────────────

const AVATAR_COLORS = ["#6B1A2A", "#8B2A3A", "#4A1020", "#9B3A4A", "#5A0A1A", "#7C2233", "#3A0D18"];

function getInitials(name: string) {
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: getAvatarColor(name),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.35,
        fontWeight: 700,
        color: "#fff",
        flexShrink: 0,
        border: "2px solid #fff",
      }}
    >
      {getInitials(name)}
    </div>
  );
}

function RoleBadge({ role }: { role: string | null }) {
  if (!role) return null;

  const roleMap: Record<string, { label: string; bg: string; color: string }> = {
    T: { label: "Team", bg: "rgba(16,185,129,0.1)", color: "#10b981" },
    TM: { label: "Manager", bg: "rgba(59,130,246,0.1)", color: "#3b82f6" },
    SA: { label: "Admin", bg: "rgba(107,26,42,0.1)", color: "#6B1A2A" },
  };

  const style = roleMap[role] ?? { label: role, bg: "#f3f4f6", color: "#666" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: "0",
        fontSize: "0.7rem",
        fontWeight: 600,
        background: style.bg,
        color: style.color,
        border: "1px solid rgba(0,0,0,0.05)",
      }}
    >
      {style.label}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function EquipeGrid({
  members,
  roles,
  loading,
  readOnly,
  onPageChange,
  onSearch,
  onRefresh,
  totalItems = 0,
  totalPages = 1,
  currentPage = 1,
  roleFilter,
  onRoleFilter,
}: Props) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone: "",
    age: "",
    slack_id: "",
    role: "T",
    is_boss: false,
  });
  const [error, setError] = useState<string | null>(null);

  function handleSearch(value: string) {
    setSearchValue(value);
    onSearch?.(value);
  }

  function handleMemberClick(member: TeamMember) {
    router.push(`/dashboard/teams/team-member/${member.id}`);
  }

  function resetForm() {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      phone: "",
      age: "",
      slack_id: "",
      role: "T",
      is_boss: false,
    });
    setError(null);
    setShowPassword(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/equipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la création du membre");
      }

      // Success
      setShowModal(false);
      resetForm();
      onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Main View ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "#F5F2ED" }}>
      {/* Header */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          padding: "16px 24px",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            {/* Title + Count */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "0",
                  background: "rgba(107,26,42,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(0,0,0,0.05)",
                }}
              >
                <Users size={24} color="#6B1A2A" />
              </div>
              <div>
                <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#1A1A1A", margin: 0 }}>
                  Équipe
                </h1>
                <p style={{ fontSize: "0.85rem", color: "#666", margin: "4px 0 0" }}>
                  {totalItems} {totalItems > 1 ? "membres" : "membre"}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {!readOnly && (
                <button
                  onClick={() => setShowModal(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 16px",
                    borderRadius: "0",
                    border: "1px solid rgba(107,26,42,0.2)",
                    background: "#6B1A2A",
                    color: "#fff",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <Plus size={16} />
                  Nouveau membre
                </button>
              )}
            </div>

            {/* Search + Filter */}
            <div style={{ display: "flex", gap: "10px", flex: "1", maxWidth: "500px" }}>
              {/* Search */}
              <div style={{ position: "relative", flex: 1 }}>
                <Search
                  size={16}
                  color="#888"
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchValue}
                  onChange={(e) => handleSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px 10px 36px",
                    borderRadius: "0",
                    border: "1px solid rgba(0,0,0,0.1)",
                    background: "#fff",
                    fontSize: "0.85rem",
                    fontFamily: "'DM Sans', sans-serif",
                    color: "#1A1A1A",
                    outline: "none",
                  }}
                />
              </div>

              {/* Role Filter */}
              <div style={{ position: "relative" }}>
                <Filter
                  size={14}
                  color="#6B1A2A"
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                    zIndex: 1,
                  }}
                />
                <select
                  value={roleFilter ?? ""}
                  onChange={(e) => onRoleFilter?.(e.target.value)}
                  style={{
                    appearance: "none",
                    WebkitAppearance: "none",
                    paddingLeft: "34px",
                    paddingRight: "32px",
                    paddingTop: "10px",
                    paddingBottom: "10px",
                    borderRadius: "0",
                    border: "1px solid rgba(0,0,0,0.1)",
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    color: roleFilter ? "#1A1A1A" : "#aaa",
                    fontFamily: "'DM Sans', sans-serif",
                    outline: "none",
                    minWidth: "140px",
                  }}
                >
                  <option value="">Tous les rôles</option>
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r === "SA" ? "Admin" : r === "TM" ? "Manager" : "Team"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "16px" }}>
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#999" }}>Chargement...</div>
        ) : members.length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#999" }}>
            Aucun membre trouvé
          </div>
        ) : (
          <>
            {/* Asymmetric Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "10px",
                marginBottom: "16px",
              }}
            >
              {members.map((member, index) => (
                <div
                  key={member.id}
                  onClick={() => handleMemberClick(member)}
                  style={{
                    background: "#fff",
                    borderRadius: "0",
                    padding: "16px",
                    border: "1px solid rgba(0,0,0,0.1)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    gridColumn: index === 0 && members.length > 1 ? "span 2" : "span 1",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(107,26,42,0.3)";
                    e.currentTarget.style.background = "#fafafa";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)";
                    e.currentTarget.style.background = "#fff";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "12px",
                    }}
                  >
                    <Avatar
                      name={member.full_name}
                      size={index === 0 && members.length > 1 ? 56 : 44}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          marginBottom: "4px",
                        }}
                      >
                        <h3
                          style={{
                            fontSize: index === 0 && members.length > 1 ? "1rem" : "0.9rem",
                            fontWeight: 600,
                            color: "#1A1A1A",
                            margin: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {member.full_name}
                        </h3>
                        {member.is_boss && (
                          <Crown size={14} color="#6B1A2A" style={{ flexShrink: 0 }} />
                        )}
                      </div>
                      <RoleBadge role={member.role} />
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {member.email && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Mail size={12} color="#888" />
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "#666",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {member.email}
                        </span>
                      </div>
                    )}
                    {member.phone && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Phone size={12} color="#888" />
                        <span style={{ fontSize: "0.75rem", color: "#666" }}>{member.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  padding: "16px",
                }}
              >
                <button
                  onClick={() => onPageChange?.(currentPage - 1)}
                  disabled={currentPage <= 1}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "0",
                    border: "1px solid rgba(0,0,0,0.1)",
                    background: currentPage <= 1 ? "#f3f4f6" : "#fff",
                    color: currentPage <= 1 ? "#ccc" : "#666",
                    cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <ChevronLeft size={16} />
                  Précédent
                </button>

                <span style={{ fontSize: "0.85rem", color: "#666" }}>
                  Page {currentPage} sur {totalPages}
                </span>

                <button
                  onClick={() => onPageChange?.(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "0",
                    border: "1px solid rgba(0,0,0,0.1)",
                    background: currentPage >= totalPages ? "#f3f4f6" : "#fff",
                    color: currentPage >= totalPages ? "#ccc" : "#666",
                    cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  Suivant
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Nouveau Membre */}
      {showModal && (
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
          onClick={() => {
            setShowModal(false);
            resetForm();
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "0",
              border: "1px solid rgba(0,0,0,0.1)",
              width: "100%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px",
                borderBottom: "1px solid rgba(0,0,0,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1A1A1A", margin: 0 }}>
                Nouveau membre
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
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
            <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
              {error && (
                <div
                  style={{
                    padding: "12px",
                    background: "rgba(220, 38, 38, 0.1)",
                    border: "1px solid rgba(220, 38, 38, 0.2)",
                    color: "#dc2626",
                    fontSize: "0.85rem",
                    marginBottom: "16px",
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {/* Prénom */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "#666",
                      marginBottom: "6px",
                    }}
                  >
                    Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "0",
                      border: "1px solid rgba(0,0,0,0.1)",
                      fontSize: "0.85rem",
                      fontFamily: "'DM Sans', sans-serif",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Nom */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "#666",
                      marginBottom: "6px",
                    }}
                  >
                    Nom *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "0",
                      border: "1px solid rgba(0,0,0,0.1)",
                      fontSize: "0.85rem",
                      fontFamily: "'DM Sans', sans-serif",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Email */}
                <div style={{ gridColumn: "span 2" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "#666",
                      marginBottom: "6px",
                    }}
                  >
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "0",
                      border: "1px solid rgba(0,0,0,0.1)",
                      fontSize: "0.85rem",
                      fontFamily: "'DM Sans', sans-serif",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Mot de passe */}
                <div style={{ gridColumn: "span 2" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "#666",
                      marginBottom: "6px",
                    }}
                  >
                    Mot de passe *
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        paddingRight: "40px",
                        borderRadius: "0",
                        border: "1px solid rgba(0,0,0,0.1)",
                        fontSize: "0.85rem",
                        fontFamily: "'DM Sans', sans-serif",
                        outline: "none",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#888",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Téléphone */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "#666",
                      marginBottom: "6px",
                    }}
                  >
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "0",
                      border: "1px solid rgba(0,0,0,0.1)",
                      fontSize: "0.85rem",
                      fontFamily: "'DM Sans', sans-serif",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Âge */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "#666",
                      marginBottom: "6px",
                    }}
                  >
                    Âge
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "0",
                      border: "1px solid rgba(0,0,0,0.1)",
                      fontSize: "0.85rem",
                      fontFamily: "'DM Sans', sans-serif",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Slack ID */}
                <div style={{ gridColumn: "span 2" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "#666",
                      marginBottom: "6px",
                    }}
                  >
                    Slack ID
                  </label>
                  <input
                    type="text"
                    value={formData.slack_id}
                    onChange={(e) => setFormData({ ...formData, slack_id: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "0",
                      border: "1px solid rgba(0,0,0,0.1)",
                      fontSize: "0.85rem",
                      fontFamily: "'DM Sans', sans-serif",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Rôle */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "#666",
                      marginBottom: "6px",
                    }}
                  >
                    Rôle *
                  </label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "0",
                      border: "1px solid rgba(0,0,0,0.1)",
                      fontSize: "0.85rem",
                      fontFamily: "'DM Sans', sans-serif",
                      outline: "none",
                      background: "#fff",
                    }}
                  >
                    <option value="T">Team</option>
                    <option value="TM">Team Manager</option>
                    <option value="SA">Super Admin</option>
                  </select>
                </div>

                {/* Boss */}
                <div style={{ display: "flex", alignItems: "center", paddingTop: "28px" }}>
                  <label
                    style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.is_boss}
                      onChange={(e) => setFormData({ ...formData, is_boss: e.target.checked })}
                      style={{ width: "16px", height: "16px", cursor: "pointer" }}
                    />
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#666" }}>
                      Chef d&apos;équipe
                    </span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "flex-end",
                  marginTop: "24px",
                  paddingTop: "20px",
                  borderTop: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "0",
                    border: "1px solid rgba(0,0,0,0.1)",
                    background: "#fff",
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
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "0",
                    border: "1px solid rgba(107,26,42,0.2)",
                    background: submitting ? "#ccc" : "#6B1A2A",
                    color: "#fff",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {submitting ? "Création..." : "Créer le membre"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
