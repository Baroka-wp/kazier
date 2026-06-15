"use client";

import useSWR from "swr";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { isTeamManager } from "@/lib/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import TMKanbanWrapper from "@/components/dashboard/TMKanbanWrapper";
import TaskFormModal from "@/components/dashboard/TaskFormModal";
import { useSWRConfig } from "swr";
import { getTeamMembersByProject } from "@/lib/task-actions";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Project = { id: string; name: string };
type ProjectsResponse = { data: Project[] };
type TeamMember = { id: string; first_name: string; last_name: string };

export default function TasksPage() {
  const { mutate: globalMutate } = useSWRConfig();
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role ?? null;
  const isTM = isTeamManager(userRole);
  const { isSuperAdmin } = usePermissions();
  const showKanban = isTM || isSuperAdmin;

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Fetch team members when project changes
  useEffect(() => {
    async function loadMembers() {
      if (!selectedProjectId) {
        setTeamMembers([]);
        return;
      }
      const result = await getTeamMembersByProject(selectedProjectId);
      if (result.success && result.members) {
        setTeamMembers(result.members);
      }
    }
    loadMembers();
  }, [selectedProjectId]);

  // Fetch projets
  const { data: projectsData } = useSWR<ProjectsResponse>(
    showKanban ? "/api/projects" : null,
    fetcher,
    {
      onSuccess: (data) => {
        // Sélectionner le premier projet par défaut au premier chargement
        if (data?.data?.length && selectedProjectId === null) {
          setSelectedProjectId(data.data[0].id);
        }
      },
    }
  );
  const projects = projectsData?.data ?? [];

  // Fetch tâches kanban (filtrées par projet)
  const kanbanParams = new URLSearchParams({ limit: "100" });
  if (selectedProjectId) kanbanParams.set("projectId", String(selectedProjectId));

  const { data: kanbanData, mutate: refreshKanban } = useSWR(
    showKanban && selectedProjectId ? `/api/tasks?${kanbanParams.toString()}` : null,
    fetcher,
    { dedupingInterval: 0, revalidateOnFocus: true, refreshInterval: 10000 }
  );

  if (!showKanban) return null;

  return (
    <div style={{ padding: "20px" }}>
      <TMKanbanWrapper
        tasks={kanbanData?.data ?? []}
        isLoading={!kanbanData && !!selectedProjectId}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onProjectChange={setSelectedProjectId}
        onAddTask={() => setShowAddTask(true)}
      />

      <TaskFormModal
        show={showAddTask && !!selectedProjectId}
        mode="create"
        task={null}
        projectId={selectedProjectId || ""}
        teamMembers={teamMembers}
        onClose={() => setShowAddTask(false)}
        onSuccess={async () => {
          setShowAddTask(false);
          await globalMutate((key) => typeof key === "string" && key.startsWith("/api/tasks"), {
            revalidate: true,
          });
          await refreshKanban();
        }}
      />
    </div>
  );
}
