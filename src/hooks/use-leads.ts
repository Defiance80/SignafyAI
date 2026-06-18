"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Lead, LeadStatus, Business, IntentSignal, GeneratedAsset } from "@/lib/supabase/types";

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
      target_market?: "b2b" | "b2c" | "both";
      // AI-interpreted target description (primary input)
      target_description?: string;
      // B2B (programmatic/API use)
      b2b_vertical?: "marketing_agency" | "saas_software" | "business_consultant" | "commercial_support" | "recruiting_firm" | "insurance_agency";
      insurance_sub_targets?: Array<"construction" | "medical" | "manufacturing">;
      b2b_sources?: Array<"linkedin" | "directories" | "company_websites">;
      // B2C (programmatic/API use)
      b2c_sources?: Array<"reddit" | "twitter" | "yelp" | "youtube">;
      // Common
      industry?: string;
      location?: string;
      platforms?: string[];
      keywords?: string[];
      min_score?: number;
      save_config_name?: string;
      // Agency mode
      client_service?: string;
      generate_landing_page?: boolean;
      for_client?: boolean;
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
      return res.json() as Promise<{ run_id: string; status: string; n8n_triggered: boolean; target_market: string; message: string }>;
    },
    onSuccess: () => {
      // Refresh all panels after a short delay to pick up immediate results
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["leads"] });
        qc.invalidateQueries({ queryKey: ["businesses"] });
        qc.invalidateQueries({ queryKey: ["intent-signals"] });
        qc.invalidateQueries({ queryKey: ["generated-assets"] });
      }, 3000);
    },
  });
}

// ─── Blue Wolf Intelligence hooks ─────────────────────────────────────────────

interface BusinessesParams {
  page?: number;
  per_page?: number;
  search?: string;
  run_id?: string;
  sort?: string;
  dir?: "asc" | "desc";
}

export function useBusinesses(params: BusinessesParams = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.per_page) qs.set("per_page", String(params.per_page));
  if (params.search) qs.set("search", params.search);
  if (params.run_id) qs.set("run_id", params.run_id);
  if (params.sort) qs.set("sort", params.sort);
  if (params.dir) qs.set("dir", params.dir);

  return useQuery({
    queryKey: ["businesses", params],
    queryFn: async () => {
      const res = await fetch(`/api/businesses?${qs}`);
      if (!res.ok) throw new Error("Failed to fetch businesses");
      return res.json() as Promise<{ data: Business[]; total: number; page: number; per_page: number }>;
    },
    staleTime: 30_000,
  });
}

interface IntentSignalsParams {
  page?: number;
  per_page?: number;
  search?: string;
  run_id?: string;
  stage?: string;
  urgency?: string;
  sort?: string;
  dir?: "asc" | "desc";
}

export function useIntentSignals(params: IntentSignalsParams = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.per_page) qs.set("per_page", String(params.per_page));
  if (params.search) qs.set("search", params.search);
  if (params.run_id) qs.set("run_id", params.run_id);
  if (params.stage) qs.set("stage", params.stage);
  if (params.urgency) qs.set("urgency", params.urgency);
  if (params.sort) qs.set("sort", params.sort);
  if (params.dir) qs.set("dir", params.dir);

  return useQuery({
    queryKey: ["intent-signals", params],
    queryFn: async () => {
      const res = await fetch(`/api/intent-signals?${qs}`);
      if (!res.ok) throw new Error("Failed to fetch intent signals");
      return res.json() as Promise<{ data: IntentSignal[]; total: number; page: number; per_page: number }>;
    },
    staleTime: 30_000,
  });
}

interface GeneratedAssetsParams {
  page?: number;
  per_page?: number;
  search?: string;
  run_id?: string;
  sort?: string;
  dir?: "asc" | "desc";
}

export function useGeneratedAssets(params: GeneratedAssetsParams = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.per_page) qs.set("per_page", String(params.per_page));
  if (params.search) qs.set("search", params.search);
  if (params.run_id) qs.set("run_id", params.run_id);
  if (params.sort) qs.set("sort", params.sort);
  if (params.dir) qs.set("dir", params.dir);

  return useQuery({
    queryKey: ["generated-assets", params],
    queryFn: async () => {
      const res = await fetch(`/api/generated-assets?${qs}`);
      if (!res.ok) throw new Error("Failed to fetch generated assets");
      return res.json() as Promise<{ data: GeneratedAsset[]; total: number; page: number; per_page: number }>;
    },
    staleTime: 30_000,
  });
}
