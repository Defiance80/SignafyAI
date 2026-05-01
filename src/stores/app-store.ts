import { create } from "zustand";
import type { Organization, Lead, WorkflowRun } from "@/lib/supabase/types";

interface AppStore {
  org: Organization | null;
  setOrg: (org: Organization | null) => void;

  // Lead discovery state
  activeDiscoveryRunId: string | null;
  setActiveDiscoveryRunId: (id: string | null) => void;
  discoveryProgress: { found: number; scored: number; total_estimated: number } | null;
  setDiscoveryProgress: (p: AppStore["discoveryProgress"]) => void;

  // Recent workflow runs (shown on dashboard)
  recentRuns: WorkflowRun[];
  setRecentRuns: (runs: WorkflowRun[]) => void;
  addRun: (run: WorkflowRun) => void;
  updateRun: (id: string, update: Partial<WorkflowRun>) => void;

  // Realtime lead feed (new leads streamed in during discovery)
  realtimeLeads: Lead[];
  addRealtimeLead: (lead: Lead) => void;
  clearRealtimeLeads: () => void;

  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  selectedLeadId: string | null;
  setSelectedLeadId: (id: string | null) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  org: null,
  setOrg: (org) => set({ org }),

  activeDiscoveryRunId: null,
  setActiveDiscoveryRunId: (id) => set({ activeDiscoveryRunId: id }),
  discoveryProgress: null,
  setDiscoveryProgress: (p) => set({ discoveryProgress: p }),

  recentRuns: [],
  setRecentRuns: (runs) => set({ recentRuns: runs }),
  addRun: (run) => set((s) => ({ recentRuns: [run, ...s.recentRuns].slice(0, 20) })),
  updateRun: (id, update) =>
    set((s) => ({
      recentRuns: s.recentRuns.map((r) => (r.id === id ? { ...r, ...update } : r)),
    })),

  realtimeLeads: [],
  addRealtimeLead: (lead) =>
    set((s) => ({ realtimeLeads: [lead, ...s.realtimeLeads].slice(0, 100) })),
  clearRealtimeLeads: () => set({ realtimeLeads: [] }),

  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  selectedLeadId: null,
  setSelectedLeadId: (id) => set({ selectedLeadId: id }),
}));
