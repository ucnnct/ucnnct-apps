import { apiFetch } from "./client";

export type PostType = "TEXT" | "MEDIA" | "ACTIVITY";
export type PostVisibility = "PUBLIC" | "FRIENDS" | "GROUP";
export type ParticipationStatus = "GOING" | "INTERESTED" | "CANCELLED";

export interface ActivityPayload {
  title: string;
  category?: string;
  domain?: string;
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

export interface ActivityDomain {
  id: number;
  name: string;
  description: string | null;
}

export interface ActivitySuggestion {
  id: number;
  title: string;
  domain: string;
  usageCount: number;
}

export interface CommentResponse {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface ParticipantResponse {
  id: string;
  postId: string;
  userId: string;
  displayName: string;
  status: ParticipationStatus;
  createdAt: string;
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

  listActivityParticipants: (postId: string) =>
    apiFetch<ParticipantResponse[]>(`/api/activities/${postId}/participants`),

  removeActivityParticipant: (postId: string, userId: string) =>
    apiFetch<PostResponse>(
      `/api/activities/${postId}/participants/${encodeURIComponent(userId)}`,
      { method: "DELETE" },
    ),

  completeActivity: (postId: string) =>
    apiFetch<PostResponse>(`/api/activities/${postId}/complete`, { method: "POST" }),

  getActivityDomains: () =>
    apiFetch<ActivityDomain[]>("/api/activity-catalog/domains"),

  searchActivitySuggestions: (query: string, limit = 8) =>
    apiFetch<ActivitySuggestion[]>(
      `/api/activity-catalog/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`,
    ),

  listComments: (postId: string) =>
    apiFetch<CommentResponse[]>(`/api/posts/${postId}/comments`),

  addComment: (postId: string, content: string) =>
    apiFetch<CommentResponse>(`/api/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
};
