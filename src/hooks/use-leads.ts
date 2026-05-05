"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Lead, LeadStatus } from "@/lib/supabase/types";

interface LeadsParams {
  page?: number;
  per_page?: number;
  status?: string;
  platform?: string;
  search?: string;
  sort?: string;
  dir?: "asc" | "desc";
}

export function useLeads(params: LeadsParams = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.per_page) qs.set("per_page", String(params.per_page));
  if (params.status) qs.set("status", params.status);
  if (params.platform) qs.set("platform", params.platform);
  if (params.search) qs.set("search", params.search);
  if (params.sort) qs.set("sort", params.sort);
  if (params.dir) qs.set("dir", params.dir);

  return useQuery({
    queryKey: ["leads", params],
    queryFn: async () => {
      const res = await fetch(`/api/leads?${qs}`);
      if (!res.ok) throw new Error("Failed to fetch leads");
      return res.json() as Promise<{ data: Lead[]; total: number; page: number; per_page: number }>;
    },
    staleTime: 30_000,
  });
}

export function useLeadDetail(id: string | null) {
  return useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${id}`);
      if (!res.ok) throw new Error("Failed to fetch lead");
      return res.json() as Promise<{ lead: Lead; activities: unknown[] }>;
    },
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<Lead> & { id: string }) => {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (!res.ok) throw new Error("Failed to update lead");
      return res.json() as Promise<Lead>;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.setQueryData(["lead", updated.id], (old: { lead: Lead; activities: unknown[] } | undefined) =>
        old ? { ...old, lead: updated } : undefined
      );
    },
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete lead");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}

export function useDiscoverLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      target_market?: "b2b" | "b2c";
      b2c_sources?: Array<"reddit" | "review_platforms" | "directories">;
      b2b_sources?: Array<"linkedin" | "directories" | "company_websites">;
      industry?: string;
      location?: string;
      platforms?: string[];
      keywords?: string[];
      min_score?: number;
      save_config_name?: string;
    }) => {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discover", ...params }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Discovery failed");
      }
      return res.json() as Promise<{ run_id: string; status: string; message: string }>;
    },
    onSuccess: () => {
      // Refresh leads after a short delay to pick up any immediate results
      setTimeout(() => qc.invalidateQueries({ queryKey: ["leads"] }), 3000);
    },
  });
}
