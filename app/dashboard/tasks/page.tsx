import { getTasks } from "@/lib/task-actions";
import TasksTable from "@/components/dashboard/TasksTable/";

export const revalidate = 0; // désactive le cache

export default async function TasksPage() {
  const result = await getTasks();
  const tasks = result.success ? result.tasks! : [];

  return <TasksTable tasks={tasks} />;
}