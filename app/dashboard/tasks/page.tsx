"use client";

import useSWR from "swr";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { isTeamManager } from "@/lib/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import TMKanbanWrapper from "@/components/dashboard/TMKanbanWrapper";
import dynamic from "next/dynamic";
import { useSWRConfig } from "swr";
import { type Project as TaskProject } from "@/components/dashboard/TasksTable/types";

const EditModal = dynamic(
  () =>
    import("@/components/dashboard/TasksTable/EditModal-Wrapper").then((m) => ({
      default: m.EditModal,
    })),
  { ssr: false }
);

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Project = { id: number; name: string };
type ProjectsResponse = { data: Project[] };

export default function TasksPage() {
  const { mutate: globalMutate } = useSWRConfig();
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role ?? null;
  const isTM = isTeamManager(userRole);
  const { isSuperAdmin } = usePermissions();
  const showKanban = isTM || isSuperAdmin;

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);

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

      {showAddTask && selectedProjectId && (
        <EditModal
          mode="create"
          task={null}
          projects={projects as unknown as TaskProject[]}
          teams={[]}
          defaultProjectId={selectedProjectId}
          onClose={() => setShowAddTask(false)}
          onSaved={async () => {
            setShowAddTask(false);
            await globalMutate((key) => typeof key === "string" && key.startsWith("/api/tasks"), {
              revalidate: true,
            });
            await refreshKanban();
          }}
        />
      )}
    </div>
  );
}
