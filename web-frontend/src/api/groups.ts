import { apiFetch } from "./client";

export interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  type: "PUBLIC" | "PRIVATE";
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

const GROUPS_API_BASE = "/api/groups";

export const groupApi = {
  getMine: () => apiFetch<GroupSummary[]>(`${GROUPS_API_BASE}/me`),
  getById: (groupId: string) => apiFetch<GroupSummary>(`${GROUPS_API_BASE}/${encodeURIComponent(groupId)}`),
};
