"use client";

import { useState } from "react";
import { mutate } from "swr";
import DataTable from "@/components/dashboard/DataTable";
import {
  registerUser,
  updateUser,
  deleteUser,
  checkDuplicate,
  type RegisterData,
} from "@/lib/register-actions";
import { usePermissions } from "@/hooks/usePermissions";
import { X, AlertTriangle, Plus, CheckCircle2, XCircle, Crown } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type TeamMember = {
  id:           number;
  first_name:   string;
  last_name:    string;
  full_name:    string;
  phone:        string;
  age:          number;
  is_boss:      boolean;
  slack_id:     string | null;
  created_at:   string;
  user_id:      number | null;
  email:        string | null;
  role:         string | null;
};

type Action = {
  icon: "view" | "edit" | "delete";
  label: string;
  onClick: (m: TeamMember) => void;
};

type Props    = {
  members: TeamMember[];
  roles: string[];
  loading?: boolean;
  // Pagination serveur
  onPageChange?: (page: number) => void;
  onSearch?: (search: string) => void;
  totalItems?: number;
  totalPages?: number;
  currentPage?: number;
  // Filtres
  roleFilter?: string;
  onRoleFilter?: (role: string) => void;
};
type Toast    = { id: number; type: "success" | "error"; message: string };
type EditMode = "create" | "update";

// ── Badges ────────────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  const initials = name?.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  return (
    <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "rgba(107,26,42,0.07)", border: "1.5px solid rgba(107,26,42,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, color: "#6B1A2A", flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    "T":  { label: "Team",         bg: "rgba(16,185,129,0.1)",  color: "#10b981" },
    "TM": { label: "Team Manager", bg: "rgba(59,130,246,0.1)",  color: "#3b82f6" },
    "SA": { label: "Super Admin",  bg: "rgba(107,26,42,0.1)",   color: "#6B1A2A" },
  };
  const s = map[role] ?? { label: role, bg: "rgba(107,26,42,0.07)", color: "#6B1A2A" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: "20px", fontSize: "0.67rem", fontWeight: 600, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function ToastNotification({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const ok = toast.type === "success";
  return (
    <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 200, display: "flex", alignItems: "center", gap: "10px", background: "#fff", border: `1.5px solid ${ok ? "rgba(45,122,79,0.2)" : "rgba(229,62,62,0.2)"}`, borderRadius: "12px", padding: "12px 16px", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", minWidth: "280px", animation: "slideIn 0.25s ease" }}>
      {ok ? <CheckCircle2 size={18} color="#2D7A4F" /> : <XCircle size={18} color="#e53e3e" />}
      <span style={{ fontSize: "0.83rem", fontWeight: 500, color: "#1A1A1A", flex: 1 }}>{toast.message}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", display: "flex", padding: "2px" }}><X size={14} /></button>
      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes popIn   { from { opacity:0; transform:scale(0.95);      } to { opacity:1; transform:scale(1);      } }
      `}</style>
    </div>
  );
}

// ── Modal View ────────────────────────────────────────────────────────────────

function ViewModal({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "460px", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.15)", animation: "popIn 0.2s ease" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Avatar name={member.full_name} />
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#1A1A1A", display: "flex", alignItems: "center", gap: "6px" }}>
                {member.full_name}
                {member.is_boss && <Crown size={13} color="#f59e0b" />}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#aaa" }}>
                Inscrit le {new Date(member.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {member.role && <RoleBadge role={member.role} />}
            <button onClick={onClose} style={{ width: "30px", height: "30px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.08)", background: "#F5F2ED", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 24px 22px" }}>
          {[
            { label: "E-mail",    value: member.email    ?? "—" },
            { label: "Téléphone", value: member.phone          },
            { label: "Âge",       value: String(member.age)    },
            { label: "Slack ID",  value: member.slack_id ?? "—" },
            { label: "Compte",    value: member.user_id ? "✓ Actif" : "✗ Aucun" },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", gap: "16px" }}>
              <span style={{ fontSize: "0.72rem", color: "#999" }}>{label}</span>
              <span style={{ fontSize: "0.83rem", color: "#1A1A1A", fontWeight: 500 }}>{value || "—"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Modal Edit / Create ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: "10px",
  border: "1.5px solid rgba(0,0,0,0.08)", background: "#F5F2ED",
  fontSize: "0.82rem", fontFamily: "'DM Sans', sans-serif", color: "#1A1A1A",
  outline: "none",
};

function FormField({ label, value, placeholder, error, warning, type = "text", onChange, onBlur }: {
  label: string; value: string; placeholder?: string; error?: string; warning?: string;
  type?: string; onChange: (v: string) => void; onBlur?: () => void;
}) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <small style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#999", marginBottom: "4px" }}>
        {label}
      </small>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        style={{
          ...inputStyle,
          borderColor: error ? "rgba(229,62,62,0.5)" : warning ? "rgba(251,191,36,0.5)" : "rgba(0,0,0,0.08)",
        }}
      />
      {error   && <p style={{ marginTop: "4px", fontSize: "0.7rem", color: "#e53e3e" }}>{error}</p>}
      {warning && !error && <p style={{ marginTop: "4px", fontSize: "0.7rem", color: "#B7791F" }}>{warning}</p>}
    </div>
  );
}

function EditModal({ mode, member, onClose, onSaved }: {
  mode: EditMode; member: TeamMember | null;
  onClose: () => void;
  onSaved: (updated: TeamMember, created: boolean) => void;
}) {
  const [values, setValues] = useState<RegisterData>(() => ({
    first_name: member?.first_name ?? "",
    last_name:  member?.last_name  ?? "",
    email:      member?.email      ?? "",
    phone:      member?.phone      ?? "",
    age:        member ? String(member.age) : "",
    role:       member?.role       ?? "",
    is_boss:    member?.is_boss    ?? false,
    slack_id:   member?.slack_id   ?? "",
  }));
  const [errors,      setErrors]      = useState<Partial<Record<keyof RegisterData, string>>>({});
  const [warnings,    setWarnings]    = useState<Partial<Record<keyof RegisterData, string>>>({});
  const [serverError, setServerError] = useState("");
  const [saving,      setSaving]      = useState(false);

  function setField<K extends keyof RegisterData>(key: K, value: any) {
    setValues(v => ({ ...v, [key]: value }));
    setErrors(e => ({ ...e, [key]: "" }));
    setWarnings(w => ({ ...w, [key]: "" }));
    setServerError("");
  }

  // Vérification doublon en temps réel au blur
  async function handleBlurCheck(field: "email" | "phone" | "full_name" | "slack_id", value: string) {
    if (!value.trim()) return;
    const result = await checkDuplicate(field, value, member?.id);
    if (result.exists) {
      if (result.blocking) setErrors(e => ({ ...e, [field === "full_name" ? "first_name" : field]: result.message }));
      else                 setWarnings(w => ({ ...w, first_name: result.message }));
    }
  }

  async function handleSubmit() {
    setSaving(true);
    setServerError("");
    const result = mode === "create"
      ? await registerUser(values)
      : await updateUser(member!.id, values);
    setSaving(false);

    if (result.success) {
      const updated: TeamMember = {
        id:         result.user.id,
        first_name: values.first_name.trim(),
        last_name:  values.last_name.trim(),
        full_name:  `${values.first_name.trim()} ${values.last_name.trim()}`,
        email:      values.email.trim(),
        phone:      values.phone.trim(),
        age:        Number(values.age),
        role:       values.role.trim(),
        is_boss:    values.is_boss,
        slack_id:   values.slack_id.trim() || null,
        user_id:    member?.user_id    ?? null,
        created_at: member?.created_at ?? new Date().toISOString(),
      };
      onSaved(updated, mode === "create");
      onClose();
    } else {
      if ((result as any).field) setErrors(e => ({ ...e, [(result as any).field]: (result as any).error }));
      else setServerError((result as any).error);
    }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.15)", animation: "popIn 0.2s ease" }}>

        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#aaa", marginBottom: "2px" }}>
              {mode === "create" ? "Nouveau membre" : "Édition"}
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1A1A1A" }}>
              {mode === "create" ? "Ajouter un membre" : "Modifier le membre"}
            </div>
          </div>
          <button onClick={onClose} style={{ width: "30px", height: "30px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.08)", background: "#F5F2ED", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 22px 22px" }}>
          {serverError && (
            <div style={{ marginBottom: "12px", padding: "8px 12px", borderRadius: "10px", background: "rgba(229,62,62,0.07)", border: "1px solid rgba(229,62,62,0.2)", fontSize: "0.8rem", color: "#e53e3e" }}>
              {serverError}
            </div>
          )}

          {/* Prénom + Nom */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <FormField
              label="Prénom" value={values.first_name} placeholder="Jean"
              error={errors.first_name} warning={warnings.first_name}
              onChange={v => setField("first_name", v)}
              onBlur={() => handleBlurCheck("full_name", `${values.first_name} ${values.last_name}`)}
            />
            <FormField
              label="Nom" value={values.last_name} placeholder="Dupont"
              error={errors.last_name}
              onChange={v => setField("last_name", v)}
              onBlur={() => handleBlurCheck("full_name", `${values.first_name} ${values.last_name}`)}
            />
          </div>

          <FormField
            label="E-mail" value={values.email} placeholder="jean@example.com"
            error={errors.email}
            onChange={v => setField("email", v)}
            onBlur={() => handleBlurCheck("email", values.email)}
          />
          <FormField
            label="Téléphone" value={values.phone} placeholder="+229 00 00 00 00"
            error={errors.phone}
            onChange={v => setField("phone", v)}
            onBlur={() => handleBlurCheck("phone", values.phone)}
          />

          {/* Slack ID */}
          <FormField
            label="Slack ID (optionnel)" value={values.slack_id} placeholder="U0AJC8FU64R"
            error={errors.slack_id}
            onChange={v => setField("slack_id", v)}
            onBlur={() => handleBlurCheck("slack_id", values.slack_id)}
          />

          {/* Âge + Rôle */}
          <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: "10px", marginBottom: "10px" }}>
            <div>
              <small style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#999", marginBottom: "4px" }}>Âge</small>
              <input type="number" value={values.age} onChange={e => setField("age", e.target.value)} style={inputStyle} />
              {errors.age && <p style={{ marginTop: "4px", fontSize: "0.7rem", color: "#e53e3e" }}>{errors.age}</p>}
            </div>
            <div>
              <small style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#999", marginBottom: "4px" }}>Rôle</small>
              <select value={values.role} onChange={e => setField("role", e.target.value)} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>
                <option value="">Sélectionner un rôle</option>
                <option value="T">Team</option>
                <option value="TM">Team Manager</option>
                <option value="SA">Super Admin</option>
              </select>
              {errors.role && <p style={{ marginTop: "4px", fontSize: "0.7rem", color: "#e53e3e" }}>{errors.role}</p>}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button type="button" onClick={onClose} disabled={saving} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1.5px solid rgba(0,0,0,0.08)", background: "#F5F2ED", color: "#666", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              Annuler
            </button>
            <button type="button" onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", background: "#6B1A2A", color: "white", fontSize: "0.85rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Enregistrement..." : mode === "create" ? "Ajouter" : "Mettre à jour"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal Delete ──────────────────────────────────────────────────────────────

function DeleteModal({ member, onConfirm, onCancel, loading }: {
  member: TeamMember; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "420px", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.15)", animation: "popIn 0.2s ease" }}>
        <div style={{ padding: "28px 24px 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(229,62,62,0.08)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
            <AlertTriangle size={24} color="#e53e3e" />
          </div>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1A1A1A", marginBottom: "6px" }}>Supprimer ce membre ?</h3>
          <p style={{ fontSize: "0.82rem", color: "#888", marginBottom: "8px" }}>
            Vous êtes sur le point de retirer <strong>{member.full_name}</strong> de l'équipe.
          </p>
          {member.user_id && (
            <p style={{ fontSize: "0.78rem", color: "#B7791F", marginBottom: "8px", fontWeight: 500 }}>
              ⚠ Son compte utilisateur sera aussi supprimé.
            </p>
          )}
          <p style={{ fontSize: "0.78rem", color: "#e53e3e", fontWeight: 500, marginBottom: "4px" }}>
            Cette action est irréversible.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", padding: "20px 24px 24px" }}>
          <button onClick={onCancel} disabled={loading} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1.5px solid rgba(0,0,0,0.08)", background: "#F5F2ED", color: "#666", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            Annuler
          </button>
          <button onClick={onConfirm} disabled={loading} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", background: loading ? "rgba(229,62,62,0.5)" : "#e53e3e", color: "white", fontSize: "0.85rem", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            {loading ? "Suppression..." : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function TeamsTable({
  members,
  roles,
  loading: loadingProp,
  onPageChange,
  onSearch,
  totalItems,
  totalPages,
  currentPage,
  roleFilter: roleFilterProp,
  onRoleFilter,
}: Props) {
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [editTarget, setEditTarget] = useState<TeamMember | null>(null);
  const [editMode, setEditMode] = useState<EditMode>("update");
  const [toDelete, setToDelete] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const { canManageTeam } = usePermissions();

  // Utiliser le filtre externe (serveur) ou local
  const roleFilter = roleFilterProp ?? "";

  // Pas de filtrage client pour la pagination serveur
  const filtered = members;

  function addToast(type: Toast["type"], message: string) {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    const res = await deleteUser(toDelete.id);
    setDeleting(false);
    if (res.success) {
      addToast("success", `Membre "${toDelete.full_name}" supprimé.`);
      setToDelete(null);
      // ✅ Refresh optimiste des données
      await mutate((key) => typeof key === 'string' && key.startsWith('/api/equipe'));
    } else {
      addToast("error", res.error ?? "Erreur lors de la suppression.");
    }
  }

  const filtersSlot = (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      <div style={{ position: "relative" }}>
        <select value={roleFilter} onChange={e => onRoleFilter?.(e.target.value)} style={{ appearance: "none", paddingLeft: "12px", paddingRight: "28px", paddingTop: "8px", paddingBottom: "8px", border: "1.5px solid rgba(0,0,0,0.08)", borderRadius: "10px", background: "#F5F2ED", fontSize: "0.82rem", fontFamily: "'DM Sans', sans-serif", color: roleFilter ? "#1A1A1A" : "#aaa", outline: "none", cursor: "pointer" }}>
          <option value="">Tous les rôles</option>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {roleFilter && (
        <button onClick={() => onRoleFilter?.("")} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "8px 12px", borderRadius: "10px", border: "1.5px solid rgba(107,26,42,0.2)", background: "rgba(107,26,42,0.05)", color: "#6B1A2A", fontSize: "0.78rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
          <X size={12} /> Réinitialiser
        </button>
      )}

      {/* ✅ Bouton "Ajouter membre" visible seulement pour SA */}
      {canManageTeam && (
        <button
          onClick={() => { setEditMode("create"); setEditTarget(null); }}
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "10px", border: "none", background: "#6B1A2A", color: "white", fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
        >
          <Plus size={14} /> Ajouter membre
        </button>
      )}
    </div>
  );

  // ✅ Construire les actions en fonction des permissions
  const actions: Action[] = [
    { icon: "view", label: "Voir", onClick: (m) => setSelected(m) },
    ...(canManageTeam ? [{ icon: "edit" as const, label: "Modifier", onClick: (m: TeamMember) => { setEditMode("update"); setEditTarget(m); } }] : []),
    ...(canManageTeam ? [{ icon: "delete" as const, label: "Supprimer", onClick: (m: TeamMember) => setToDelete(m) }] : []),
  ];

  return (
    <>
      <DataTable
        columns={[
          {
            key: "full_name", label: "Membre", sortable: true,
            render: m => (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Avatar name={m.full_name} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: "0.83rem", display: "flex", alignItems: "center", gap: "5px" }}>
                    {m.full_name}
                    {m.is_boss && <Crown size={11} color="#f59e0b" />}
                  </div>
                  {m.slack_id && <div style={{ fontSize: "0.68rem", color: "#aaa" }}>@{m.slack_id}</div>}
                </div>
              </div>
            ),
          },
          { key: "role",  label: "Rôle",     sortable: true, render: m => <RoleBadge role={m.role ?? "Membre"} /> },
          { key: "email", label: "E-mail",    sortable: true, render: m => <span style={{ fontSize: "0.8rem", color: "#555" }}>{m.email ?? "—"}</span> },
          { key: "phone", label: "Téléphone", sortable: true },
          { key: "age",   label: "Âge",       sortable: true },
          {
            key: "user_id", label: "Compte",
            render: m => m.user_id
              ? <span style={{ fontSize: "0.7rem", color: "#2D7A4F", fontWeight: 600 }}>✓ Actif</span>
              : <span style={{ fontSize: "0.7rem", color: "#aaa" }}>— Aucun</span>,
          },
          {
            key: "created_at", label: "Inscrit le", sortable: true,
            render: m => <span style={{ fontSize: "0.75rem", color: "#aaa", whiteSpace: "nowrap" }}>{new Date(m.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>,
          },
        ]}
        data={filtered}
        actions={actions}
        pageSize={8}
        searchPlaceholder="Rechercher un membre..."
        emptyMessage="Aucun membre dans l'équipe."
        filters={filtersSlot}
        loading={loadingProp}
        // Pagination serveur
        onPageChange={onPageChange}
        onSearch={onSearch}
        totalItems={totalItems}
        totalPages={totalPages}
        currentPage={currentPage}
      />

      {selected && <ViewModal member={selected} onClose={() => setSelected(null)} />}

      {(editMode === "create" || editTarget) && (
        <EditModal
          mode={editMode}
          member={editTarget}
          onClose={() => { setEditTarget(null); setEditMode("update"); }}
          onSaved={async (updated, created) => {
            if (created) {
              addToast("success", `"${updated.full_name}" ajouté à l'équipe.`);
            } else {
              addToast("success", `Profil de "${updated.full_name}" mis à jour.`);
            }
            // ✅ Refresh optimiste des données
            await mutate((key) => typeof key === 'string' && key.startsWith('/api/equipe'));
          }}
        />
      )}

      {toDelete && (
        <DeleteModal
          member={toDelete} loading={deleting}
          onCancel={() => setToDelete(null)}
          onConfirm={handleDelete}
        />
      )}

      {toasts.map(t => (
        <ToastNotification key={t.id} toast={t} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
      ))}
    </>
  );
}
