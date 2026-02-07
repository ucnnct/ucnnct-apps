import { apiFetch } from "./client";

export interface UserProfile {
  keycloakId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  bio: string | null;
  university: string | null;
  location: string | null;
  website: string | null;
  avatarUrl: string | null;
  fieldOfStudy: string | null;
  yearOfStudy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileData {
  bio?: string;
  university?: string;
  location?: string;
  website?: string;
  avatarUrl?: string;
  fieldOfStudy?: string;
  yearOfStudy?: number;
}

export const userApi = {
  getMe: () =>
    apiFetch<UserProfile>("/api/users/me"),

  updateMe: (data: UpdateProfileData) =>
    apiFetch<UserProfile>("/api/users/me", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getById: (id: string) =>
    apiFetch<UserProfile>(`/api/users/${id}`),

  getAll: () =>
    apiFetch<UserProfile[]>("/api/users"),

  search: (query: string) =>
    apiFetch<UserProfile[]>(`/api/users/search?q=${encodeURIComponent(query)}`),
};
