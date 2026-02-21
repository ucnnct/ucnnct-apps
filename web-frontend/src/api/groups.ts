import { apiFetch } from "./client";

export type GroupType = "PUBLIC" | "PRIVATE";
export type GroupMemberRole = "OWNER" | "ADMIN" | "MEMBER";

export interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  type: GroupType;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGroupPayload {
  name: string;
  description?: string | null;
  type?: GroupType;
}

export interface GroupMemberSummary {
  groupId: string;
  userId: string;
  role: GroupMemberRole;
  joinedAt: string;
}

export interface AddGroupMemberPayload {
  userId: string;
  role?: Exclude<GroupMemberRole, "OWNER">;
}

const GROUPS_API_BASE = "/api/groups";

export const groupApi = {
  getMine: () => apiFetch<GroupSummary[]>(`${GROUPS_API_BASE}/me`),
  getById: (groupId: string) => apiFetch<GroupSummary>(`${GROUPS_API_BASE}/${encodeURIComponent(groupId)}`),
  create: (payload: CreateGroupPayload) =>
    apiFetch<GroupSummary>(GROUPS_API_BASE, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getMembers: (groupId: string) =>
    apiFetch<GroupMemberSummary[]>(`${GROUPS_API_BASE}/${encodeURIComponent(groupId)}/members`),
  addMember: (groupId: string, payload: AddGroupMemberPayload) =>
    apiFetch<GroupMemberSummary>(`${GROUPS_API_BASE}/${encodeURIComponent(groupId)}/members`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  removeMember: (groupId: string, userId: string) =>
    apiFetch<void>(
      `${GROUPS_API_BASE}/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
      },
    ),
};
