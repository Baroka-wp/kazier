"use client";

import ProjectCard from "./ProjectCard";
import { type ProjectWithTasks } from "@/lib/team-actions";

type Props = {
  project: ProjectWithTasks;
  teamMemberId: number;
};

export default function ProjectCardWrapper({ project, teamMemberId }: Props) {
  return (
    <ProjectCard
      project={project}
      teamMemberId={teamMemberId}
      onTasksUpdated={() => {
        // Pas besoin de faire grand chose ici
        // Les updates sont gérées par revalidatePath dans les server actions
      }}
    />
  );
}
