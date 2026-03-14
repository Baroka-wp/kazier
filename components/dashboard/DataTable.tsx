"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  Eye, Pencil, Trash2,
  ChevronLeft, ChevronRight,
  Search, X, RefreshCw,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Column<T> = {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (row: T) => React.ReactNode;
};

export type DataTableAction<T> = {
  icon: "view" | "edit" | "delete";
  label: string;
  onClick: (row: T) => void;
};

type SortDir = "asc" | "desc" | null;

type Props<T extends { id: number | string }> = {
  columns: Column<T>[];
  data: T[];
  actions?: DataTableAction<T>[];
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loading?: boolean;
  filters?: React.ReactNode;
  refreshable?: boolean;
  // Callbacks pour pagination serveur
  onPageChange?: (page: number) => void;
  onSearch?: (search: string) => void;
  totalItems?: number;
  totalPages?: number;
  currentPage?: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getNestedValue(obj: any, key: string): any {
  return key.split(".").reduce((acc, k) => acc?.[k], obj);
}

// ── DataTable ─────────────────────────────────────────────────────────────────

export default function DataTable<T extends { id: number | string }>({
  columns,
  data = [],
  actions,
  pageSize = 10,
  searchable = true,
  searchPlaceholder = "Rechercher...",
  emptyMessage = "Aucune donnée à afficher.",
  loading = false,
  filters,
  refreshable = true,
  onPageChange,
  onSearch,
  totalItems,
  totalPages: serverTotalPages,
  currentPage,
}: Props<T>) {
  const router = useRouter();
  const [search, setSearch]         = useState("");
  const [sortKey, setSortKey]       = useState<string | null>(null);
  const [sortDir, setSortDir]       = useState<SortDir>(null);
  const [page, setPage]             = useState(currentPage ?? 1);
  const [refreshing, setRefreshing] = useState(false);

  // Utiliser pagination serveur ou client
  const isServerPagination = !!onPageChange;
  const totalPages = serverTotalPages ?? Math.max(1, Math.ceil((totalItems ?? data.length) / pageSize));

  async function handleRefresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  }

  // Pagination serveur : pas de tri/filter client
  const sorted = useMemo(() => {
    if (isServerPagination) return data;
    if (!sortKey || !sortDir) return data;
    return [...data].sort((a, b) => {
      const av = getNestedValue(a, sortKey);
      const bv = getNestedValue(b, sortKey);
      const cmp = String(av ?? "").localeCompare(String(bv ?? ""), "fr", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir, isServerPagination]);

  const paginated = isServerPagination
    ? data
    : sorted.slice((page - 1) * pageSize, page * pageSize);

  function handleSort(key: string) {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); }
    else if (sortDir === "asc") setSortDir("desc");
    else { setSortKey(null); setSortDir(null); }
    setPage(1);
  }

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
    // Callback serveur
    if (onSearch) {
      onSearch(val);
    }
  }

  function getPageRange() {
    const delta = 2;
    const range: (number | "…")[] = [];
    const left  = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);
    range.push(1);
    if (left > 2) range.push("…");
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages - 1) range.push("…");
    if (totalPages > 1) range.push(totalPages);
    return range;
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    if (onPageChange) {
      onPageChange(newPage);
    }
  }

  // Pagination serveur : utiliser totalItems au lieu de sorted.length
  const displayTotal = isServerPagination ? (totalItems ?? 0) : sorted.length;
  const displayTotalPages = isServerPagination ? (serverTotalPages ?? 1) : totalPages;

  return (
    <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}>

      {/* ── Toolbar ── */}
      {(searchable || filters || refreshable) && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)", flexWrap: "wrap" }}>
          {searchable && (
            <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
              <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#aaa", pointerEvents: "none" }} />
              <input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={searchPlaceholder}
                style={{ width: "100%", paddingLeft: "34px", paddingRight: search ? "34px" : "12px", paddingTop: "8px", paddingBottom: "8px", border: "1.5px solid rgba(0,0,0,0.08)", borderRadius: "10px", background: "#F5F2ED", fontSize: "0.82rem", fontFamily: "'DM Sans', sans-serif", color: "#1A1A1A", outline: "none", transition: "border-color 0.2s" }}
                onFocus={e => e.target.style.borderColor = "#6B1A2A"}
                onBlur={e => e.target.style.borderColor = "rgba(0,0,0,0.08)"}
              />
              {search && (
                <button onClick={() => handleSearch("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#aaa", padding: "2px", display: "flex", alignItems: "center" }}>
                  <X size={13} />
                </button>
              )}
            </div>
          )}

          {filters}

          {refreshable && (
            <button
              onClick={handleRefresh} disabled={refreshing} title="Actualiser les données"
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", borderRadius: "10px", border: "1.5px solid rgba(0,0,0,0.08)", background: refreshing ? "rgba(107,26,42,0.05)" : "#F5F2ED", color: refreshing ? "#6B1A2A" : "#888", fontSize: "0.78rem", fontWeight: 500, cursor: refreshing ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s", flexShrink: 0 }}
              onMouseEnter={e => { if (!refreshing) { e.currentTarget.style.background = "rgba(107,26,42,0.07)"; e.currentTarget.style.color = "#6B1A2A"; e.currentTarget.style.borderColor = "rgba(107,26,42,0.2)"; } }}
              onMouseLeave={e => { if (!refreshing) { e.currentTarget.style.background = "#F5F2ED"; e.currentTarget.style.color = "#888"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)"; } }}
            >
              <RefreshCw size={13} style={{ transition: "transform 0.8s ease", transform: refreshing ? "rotate(360deg)" : "rotate(0deg)", animation: refreshing ? "spin 0.8s linear infinite" : "none" }} />
            </button>
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key as string}
                  onClick={() => col.sortable && handleSort(col.key as string)}
                  style={{ padding: "10px 20px", textAlign: "left", fontSize: "0.62rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: sortKey === col.key ? "#6B1A2A" : "#aaa", background: "#F5F2ED", borderBottom: "1px solid rgba(0,0,0,0.06)", whiteSpace: "nowrap", cursor: col.sortable ? "pointer" : "default", userSelect: "none", width: col.width, transition: "color 0.15s" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    {col.label}
                    {col.sortable && (
                      <span style={{ opacity: 0.5, display: "flex" }}>
                        {sortKey === col.key && sortDir === "asc"  ? <ChevronUp size={12} />
                        : sortKey === col.key && sortDir === "desc" ? <ChevronDown size={12} />
                        : <ChevronsUpDown size={12} />}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions && actions.length > 0 && (
                <th style={{ padding: "10px 20px", textAlign: "left", fontSize: "0.62rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#aaa", background: "#F5F2ED", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col, colIdx) => (
                    <td key={col.key as string} style={{ padding: "14px 20px" }}>
                      <div style={{ height: "14px", borderRadius: "6px", background: "linear-gradient(90deg, #f0ede8 25%, #e8e4df 50%, #f0ede8 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", width: `${60 + ((i * columns.length + colIdx) * 7) % 30}%` }} />
                    </td>
                  ))}
                  {actions && <td style={{ padding: "14px 20px" }}><div style={{ height: "14px", width: "80px", borderRadius: "6px", background: "#f0ede8" }} /></td>}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} style={{ padding: "48px 20px", textAlign: "center", color: "#ccc", fontSize: "0.85rem" }}>
                  {search ? `Aucun résultat pour "${search}"` : emptyMessage}
                </td>
              </tr>
            ) : (
              paginated.map((row, rowIdx) => (
                <tr
                  key={row.id}
                  style={{ transition: "background 0.12s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(107,26,42,0.02)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key as string}
                      style={{
                        padding: "13px 20px",
                        fontSize: "0.82rem",
                        color: "#1A1A1A",
                        borderBottom: rowIdx < paginated.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
                        verticalAlign: "middle",
                        // ✅ Contraindre la largeur si col.width est défini
                        ...(col.width ? { width: col.width, maxWidth: col.width, overflow: "hidden" } : {}),
                      }}
                    >
                      {col.render ? col.render(row) : String(getNestedValue(row, col.key as string) ?? "—")}
                    </td>
                  ))}
                  {actions && actions.length > 0 && (
                    <td style={{ padding: "13px 20px", borderBottom: rowIdx < paginated.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {actions.map((action) => (
                          <ActionButton key={action.icon} icon={action.icon} label={action.label} onClick={() => action.onClick(row)} />
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer pagination ── */}
      {!loading && displayTotal > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid rgba(0,0,0,0.06)", flexWrap: "wrap", gap: "8px" }}>
          <span style={{ fontSize: "0.73rem", color: "#aaa" }}>
            {displayTotal} entrée{displayTotal > 1 ? "s" : ""} au total
            {" · "}page {page} / {displayTotalPages}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <PageBtn onClick={() => handlePageChange(Math.max(1, page - 1))} disabled={page === 1} aria-label="Page précédente">
              <ChevronLeft size={14} />
            </PageBtn>
            {getPageRange().map((p, i) =>
              p === "…" ? (
                <span key={`ellipsis-${i}`} style={{ padding: "0 4px", color: "#aaa", fontSize: "0.8rem" }}>…</span>
              ) : (
                <PageBtn key={p} active={p === page} onClick={() => handlePageChange(p as number)}>{p}</PageBtn>
              )
            )}
            <PageBtn onClick={() => handlePageChange(Math.min(displayTotalPages, page + 1))} disabled={page === displayTotalPages} aria-label="Page suivante">
              <ChevronRight size={14} />
            </PageBtn>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes spin    { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── ActionButton ──────────────────────────────────────────────────────────────

function ActionButton({ icon, label, onClick }: { icon: "view" | "edit" | "delete"; label: string; onClick: () => void }) {
  const config = {
    view:   { Icon: Eye,    hoverBg: "rgba(59,130,246,0.08)",  hoverColor: "#3b82f6" },
    edit:   { Icon: Pencil, hoverBg: "rgba(107,26,42,0.08)",   hoverColor: "#6B1A2A" },
    delete: { Icon: Trash2, hoverBg: "rgba(229,62,62,0.08)",   hoverColor: "#e53e3e" },
  }[icon];

  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick} title={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: "30px", height: "30px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.08)", background: hovered ? config.hoverBg : "#F5F2ED", color: hovered ? config.hoverColor : "#aaa", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}
    >
      <config.Icon size={13} strokeWidth={2} />
    </button>
  );
}

// ── PageBtn ───────────────────────────────────────────────────────────────────

function PageBtn({ children, active, disabled, onClick, ...rest }: { children: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void; [key: string]: any }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ minWidth: "30px", height: "30px", padding: "0 6px", borderRadius: "8px", border: active ? "none" : "1px solid rgba(0,0,0,0.08)", background: active ? "#6B1A2A" : hovered && !disabled ? "rgba(107,26,42,0.07)" : "#F5F2ED", color: active ? "white" : disabled ? "#ccc" : "#666", fontSize: "0.78rem", fontWeight: active ? 600 : 400, cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", fontFamily: "'DM Sans', sans-serif" }}
      {...rest}
    >
      {children}
    </button>
  );
}
