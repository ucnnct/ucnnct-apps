import { apiFetch } from "./client";
import type { UserProfile } from "./users";

export interface Friendship {
  id: number;
  requester: Pick<UserProfile, "keycloakId" | "username" | "email" | "firstName" | "lastName" | "avatarUrl">;
  receiver: Pick<UserProfile, "keycloakId" | "username" | "email" | "firstName" | "lastName" | "avatarUrl">;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
}

export const friendApi = {
  sendRequest: (userId: string) =>
    apiFetch<Friendship>(`/api/friends/request/${userId}`, { method: "POST" }),

  accept: (userId: string) =>
    apiFetch<Friendship>(`/api/friends/accept/${userId}`, { method: "POST" }),

  reject: (userId: string) =>
    apiFetch<void>(`/api/friends/reject/${userId}`, { method: "POST" }),

  remove: (userId: string) =>
    apiFetch<void>(`/api/friends/${userId}`, { method: "DELETE" }),

  getMyFriends: () =>
    apiFetch<UserProfile[]>("/api/friends"),

  getPendingRequests: () =>
    apiFetch<Friendship[]>("/api/friends/requests"),

  getSentRequests: () =>
    apiFetch<Friendship[]>("/api/friends/sent"),

  getCount: () =>
    apiFetch<{ count: number }>("/api/friends/count"),
};
