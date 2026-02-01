import { apiFetch } from "./client";

export interface Project {
  id: number;
  title: string;
  description: string;
  tags: string;
  imageUrl: string | null;
  link: string | null;
  createdAt: string;
}

export interface ProjectRequest {
  title: string;
  description: string;
  tags: string;
  imageUrl?: string;
  link?: string;
}

export const projectApi = {
  getMine: (token: string) =>
    apiFetch<Project[]>("/api/projects/me", token),

  getByUser: (token: string, userId: string) =>
    apiFetch<Project[]>(`/api/projects/user/${userId}`, token),

  create: (token: string, data: ProjectRequest) =>
    apiFetch<Project>("/api/projects", token, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (token: string, id: number, data: Partial<ProjectRequest>) =>
    apiFetch<Project>(`/api/projects/${id}`, token, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: number) =>
    apiFetch<void>(`/api/projects/${id}`, token, {
      method: "DELETE",
    }),
};
