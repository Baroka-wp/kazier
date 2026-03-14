"use client";

import useSWR from "swr";
import { useState, useMemo } from "react";
import RapportsTable from "@/components/dashboard/RapportsTable";

type Report = {
  id: number;
  full_name: string;
  role: string;
  built: string;
  working_built: string;
  blocked: string;
  validated_learning: string;
  needed_learning: string;
  tomorrow_build: string;
  submitted_at: string;
  project_id: number;
  project_name: string;
  project_icon?: string;
};

type ApiResponse = {
  data: Report[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  roles: string[];
  projects: Array<{ id: number; name: string }>;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function RapportsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState<number | undefined>();

  // Construire l'URL avec les paramètres
  const params = new URLSearchParams({
    page: String(page),
    limit: "10",
  });

  if (search) params.set("search", search);
  if (roleFilter) params.set("role", roleFilter);
  if (projectFilter) params.set("projectId", String(projectFilter));

  const { data, error } = useSWR<ApiResponse>(
    `/api/rapports?${params.toString()}`,
    fetcher,
    {
      dedupingInterval: 1000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  const isLoading = !data && !error;
  const isEmpty = !isLoading && (!data?.data || data.data.length === 0);

  // Handlers pour les filtres
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1); // Reset page on search
  };

  const handleRoleFilter = (value: string) => {
    setRoleFilter(value);
    setPage(1);
  };

  const handleProjectFilter = (value: number | undefined) => {
    setProjectFilter(value);
    setPage(1);
  };

  return (
    <RapportsTable
      reports={data?.data ?? []}
      roles={data?.roles ?? []}
      projects={data?.projects ?? []}
      loading={isLoading}
      isEmpty={isEmpty}
      // Pagination
      onPageChange={handlePageChange}
      onSearch={handleSearch}
      totalItems={data?.total ?? 0}
      totalPages={data?.totalPages ?? 1}
      currentPage={data?.page ?? 1}
      // Filtres
      roleFilter={roleFilter}
      onRoleFilter={handleRoleFilter}
      projectFilter={projectFilter}
      onProjectFilter={handleProjectFilter}
    />
  );
}
