import { apiFetch } from "./client";
import type { UserProfile } from "./users";

export interface Friendship {
  id: number;
  requester: Pick<UserProfile, "keycloakId" | "username" | "email" | "firstName" | "lastName">;
  receiver: Pick<UserProfile, "keycloakId" | "username" | "email" | "firstName" | "lastName">;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
}

export const friendApi = {
  sendRequest: (token: string, userId: string) =>
    apiFetch<Friendship>(`/api/friends/request/${userId}`, token, { method: "POST" }),

  accept: (token: string, userId: string) =>
    apiFetch<Friendship>(`/api/friends/accept/${userId}`, token, { method: "POST" }),

  reject: (token: string, userId: string) =>
    apiFetch<void>(`/api/friends/reject/${userId}`, token, { method: "POST" }),

  remove: (token: string, userId: string) =>
    apiFetch<void>(`/api/friends/${userId}`, token, { method: "DELETE" }),

  getMyFriends: (token: string) =>
    apiFetch<UserProfile[]>("/api/friends", token),

  getPendingRequests: (token: string) =>
    apiFetch<Friendship[]>("/api/friends/requests", token),

  getSentRequests: (token: string) =>
    apiFetch<Friendship[]>("/api/friends/sent", token),

  getCount: (token: string) =>
    apiFetch<{ count: number }>("/api/friends/count", token),
};
