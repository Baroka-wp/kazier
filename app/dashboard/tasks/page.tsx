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

  const { data, error } = useSWR<ApiResponse>(
    `/api/tasks?${params.toString()}`,
    fetcher,
    {
      keepPreviousData: true,
      dedupingInterval: 500,
    }
  );

  const isLoading = !data && !error;

  return (
    <TasksTable
      tasks={data?.data ?? []}
      loading={isLoading}
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
