"use client";

import useSWR from "swr";
import { useState } from "react";
import TeamsTable from "@/components/dashboard/TeamsTable";

type TeamMember = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  phone: string | null;
  age: number | null;
  is_boss: boolean;
  slack_id: string | null;
  created_at: string;
  user_id: number | null;
  email: string | null;
  role: string | null;
};

type ApiResponse = {
  data: TeamMember[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  roles: string[];
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function EquipePage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const params = new URLSearchParams({
    page: String(page),
    limit: "10",
  });

  if (search) params.set("search", search);
  if (roleFilter) params.set("role", roleFilter);

  const { data, error } = useSWR<ApiResponse>(
    `/api/equipe?${params.toString()}`,
    fetcher,
    {
      keepPreviousData: true,
      dedupingInterval: 500,
    }
  );

  const isLoading = !data && !error;

  return (
    <TeamsTable
      members={data?.data ?? []}
      roles={data?.roles ?? []}
      loading={isLoading}
      // Pagination
      onPageChange={setPage}
      onSearch={setSearch}
      totalItems={data?.total ?? 0}
      totalPages={data?.totalPages ?? 1}
      currentPage={data?.page ?? 1}
      // Filtres
      roleFilter={roleFilter}
      onRoleFilter={setRoleFilter}
    />
  );
}
