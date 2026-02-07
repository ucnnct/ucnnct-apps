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
  getMine: () =>
    apiFetch<Project[]>("/api/projects/me"),

  getByUser: (userId: string) =>
    apiFetch<Project[]>(`/api/projects/user/${userId}`),

  create: (data: ProjectRequest) =>
    apiFetch<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<ProjectRequest>) =>
    apiFetch<Project>(`/api/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiFetch<void>(`/api/projects/${id}`, {
      method: "DELETE",
    }),
};
