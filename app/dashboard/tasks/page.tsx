"use client";

import useSWR from "swr";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { isTeamManager } from "@/lib/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { LayoutGrid, List } from "lucide-react";
import TasksTable from "@/components/dashboard/TasksTable/";
import TMKanbanWrapper from "@/components/dashboard/TMKanbanWrapper";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Project = { id: number; name: string };
type ProjectsResponse = { data: Project[] };

export default function TasksPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role ?? null;
  const isTM = isTeamManager(userRole);
  const { isSuperAdmin } = usePermissions();
  const showKanban = isTM || isSuperAdmin;

  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  // Fetch projets pour le dropdown kanban TM
  const { data: projectsData } = useSWR<ProjectsResponse>(
    showKanban ? "/api/projects" : null,
    fetcher
  );
  const projects = projectsData?.data ?? [];

  // Fetch tâches tableau
  const params = new URLSearchParams({ page: String(page), limit: "10" });
  if (search) params.set("search", search);
  if (statusFilter) params.set("status", statusFilter);
  if (priorityFilter) params.set("priority", priorityFilter);

  const {
    data,
    error,
    mutate: refreshSWR,
  } = useSWR(`/api/tasks?${params.toString()}`, fetcher, {
    dedupingInterval: 0,
    revalidateOnFocus: true,
    refreshInterval: 10000,
  });

  // Fetch tâches kanban (filtrées par projet)
  const kanbanParams = new URLSearchParams({ limit: "100" });
  if (selectedProjectId) kanbanParams.set("projectId", String(selectedProjectId));

  const { data: kanbanData } = useSWR(
    showKanban && viewMode === "kanban" && selectedProjectId
      ? `/api/tasks?${kanbanParams.toString()}`
      : null,
    fetcher,
    { dedupingInterval: 0, revalidateOnFocus: true, refreshInterval: 10000 }
  );

  const isLoading = !data && !error;
  const isEmpty = !isLoading && (!data?.data || data.data.length === 0);

  return (
    <div>
      {/* Toggle Tableau/Kanban — visible seulement pour TM */}
      {showKanban && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "16px 20px 0",
            gap: "12px",
          }}
        >
          {/* Dropdown projet — visible en mode kanban */}
          {viewMode === "kanban" && (
            <select
              value={selectedProjectId ?? ""}
              onChange={(e) =>
                setSelectedProjectId(e.target.value ? parseInt(e.target.value) : null)
              }
              style={{
                padding: "8px 12px",
                borderRadius: "10px",
                border: "1.5px solid rgba(0,0,0,0.08)",
                background: "#F5F2ED",
                fontSize: "0.82rem",
                fontFamily: "'DM Sans', sans-serif",
                color: selectedProjectId ? "#1A1A1A" : "#aaa",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="">Sélectionner un projet</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {/* Toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px",
              borderRadius: "10px",
              background: "#F5F2ED",
              border: "1.5px solid rgba(0,0,0,0.08)",
            }}
          >
            <button
              onClick={() => setViewMode("table")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 10px",
                borderRadius: "8px",
                border: "none",
                background: viewMode === "table" ? "#6B1A2A" : "transparent",
                color: viewMode === "table" ? "white" : "#666",
                fontSize: "0.75rem",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.15s",
              }}
            >
              <List size={14} />
              Tableau
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 10px",
                borderRadius: "8px",
                border: "none",
                background: viewMode === "kanban" ? "#6B1A2A" : "transparent",
                color: viewMode === "kanban" ? "white" : "#666",
                fontSize: "0.75rem",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.15s",
              }}
            >
              <LayoutGrid size={14} />
              Kanban
            </button>
          </div>
        </div>
      )}
      <br />
      {/* Vue Tableau */}
      {viewMode === "table" && (
        <TasksTable
          tasks={data?.data ?? []}
          loading={isLoading}
          isEmpty={isEmpty}
          onRefresh={async () => {
            await refreshSWR();
          }}
          onPageChange={setPage}
          onSearch={setSearch}
          totalItems={data?.total ?? 0}
          totalPages={data?.totalPages ?? 1}
          currentPage={data?.page ?? 1}
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
          priorityFilter={priorityFilter}
          onPriorityFilter={setPriorityFilter}
        />
      )}

      {/* Vue Kanban — seulement TM */}
      {showKanban && viewMode === "kanban" && (
        <div style={{ padding: "20px" }}>
          {!selectedProjectId ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "#aaa",
                fontSize: "0.9rem",
              }}
            >
              Sélectionnez un projet pour afficher le kanban
            </div>
          ) : !kanbanData?.data ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>Chargement...</div>
          ) : (
            <TMKanbanWrapper tasks={kanbanData.data} />
          )}
        </div>
      )}
    </div>
  );
}
