import { apiFetch } from "./client";

export type PostType = "TEXT" | "MEDIA" | "ACTIVITY";
export type PostVisibility = "PUBLIC" | "FRIENDS" | "GROUP";
export type ParticipationStatus = "GOING" | "INTERESTED" | "CANCELLED";

export interface ActivityPayload {
  title: string;
  category?: string;
  location?: string;
  startAt?: string;
  endAt?: string;
  capacity?: number;
}

export interface ActivityResponse extends ActivityPayload {
  status?: string;
}

export interface PostResponse {
  id: string;
  authorId: string;
  authorName: string | null;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
  type: PostType;
  visibility: PostVisibility;
  groupId: string | null;
  content: string | null;
  mediaUrl: string | null;
  tags: string[];
  reactionCount: number;
  commentCount: number;
  participantCount: number;
  reactedByMe: boolean;
  participationStatus: ParticipationStatus | null;
  activity: ActivityResponse | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeedItem {
  post: PostResponse;
  score: number;
  reasons: string[];
}

export interface FeedResponse {
  items: FeedItem[];
  generatedAt: string;
  algorithmVersion: string;
}

export interface CreatePostPayload {
  type: PostType;
  visibility?: PostVisibility;
  content?: string;
  mediaUrl?: string;
  tags?: string[];
  activity?: ActivityPayload;
}

export const feedApi = {
  getFeed: (tab: string, limit = 30) =>
    apiFetch<FeedResponse>(`/api/feed?tab=${encodeURIComponent(tab)}&limit=${limit}`),

  createPost: (payload: CreatePostPayload) =>
    apiFetch<PostResponse>("/api/posts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  react: (postId: string) =>
    apiFetch<PostResponse>(`/api/posts/${postId}/reactions`, {
      method: "POST",
      body: JSON.stringify({ type: "LIKE" }),
    }),

  removeReaction: (postId: string) =>
    apiFetch<PostResponse>(`/api/posts/${postId}/reactions`, { method: "DELETE" }),

  joinActivity: (postId: string) =>
    apiFetch<PostResponse>(`/api/activities/${postId}/participants/me`, { method: "POST" }),

  leaveActivity: (postId: string) =>
    apiFetch<PostResponse>(`/api/activities/${postId}/participants/me`, { method: "DELETE" }),
};
