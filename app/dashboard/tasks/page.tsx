"use client";

import useSWR from "swr";
import { useState } from "react";
import TasksTable from "@/components/dashboard/TasksTable/";

type Task = {
  id: number;
  title: string;
  description: string;
  status: "à faire" | "en cours" | "review" | "terminée";
  priority: "low" | "medium" | "high";
  project_id: number | null;
  assigned_to: number[] | null;
  due_date: string | null;
  created_at: string;
  assigned_to_names?: string[];
  project_name?: string;
};

type ApiResponse = {
  data: Task[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TasksPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const params = new URLSearchParams({
    page: String(page),
    limit: "10",
  });

  if (search) params.set("search", search);
  if (statusFilter) params.set("status", statusFilter);
  if (priorityFilter) params.set("priority", priorityFilter);

  const {
    data,
    error,
    mutate: refreshSWR,
  } = useSWR<ApiResponse>(`/api/tasks?${params.toString()}`, fetcher, {
    dedupingInterval: 0,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 10000,
  });

  const isLoading = !data && !error;
  const isEmpty = !isLoading && (!data?.data || data.data.length === 0);

  // Fonction de refresh pour les tâches CRUD
  const refreshTasks = async () => {
    await refreshSWR();
  };

  return (
    <TasksTable
      tasks={data?.data ?? []}
      loading={isLoading}
      isEmpty={isEmpty}
      onRefresh={refreshTasks}
      // Pagination
      onPageChange={setPage}
      onSearch={setSearch}
      totalItems={data?.total ?? 0}
      totalPages={data?.totalPages ?? 1}
      currentPage={data?.page ?? 1}
      // Filtres
      statusFilter={statusFilter}
      onStatusFilter={setStatusFilter}
      priorityFilter={priorityFilter}
      onPriorityFilter={setPriorityFilter}
    />
  );
}
