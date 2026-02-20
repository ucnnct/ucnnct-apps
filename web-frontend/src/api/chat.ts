import { apiFetch } from "./client";

export type ChatConversationType = "PEER" | "GROUP";
export type ChatMessageType = "PEER" | "GROUP";
export type ChatMessageFormat = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
export type ChatMessageStatus = "SENT" | "DELIVERED" | "READ";

export interface ChatConversationLastMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  type: ChatConversationType;
  participants: string[];
  lastMessage: ChatConversationLastMessage | null;
  unreadCounts: Record<string, number> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  type: ChatMessageType;
  senderId: string;
  groupId: string | null;
  receiversId: string[] | null;
  targetId: string | null;
  content: string | null;
  objectKey: string | null;
  format: ChatMessageFormat;
  attachments: string[] | null;
  status: ChatMessageStatus;
  readBy: string[] | null;
  hiddenFor: string[] | null;
  edited: boolean;
  deleted: boolean;
  replyTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

const CHAT_API_BASE = "/api/chat";

export const chatApi = {
  getConversations: () => apiFetch<ChatConversation[]>(`${CHAT_API_BASE}/conversations`),

  getConversationMessages: (conversationId: string, page = 0, size = 50) =>
    apiFetch<ChatPage<ChatMessage>>(
      `${CHAT_API_BASE}/conversations/${encodeURIComponent(conversationId)}/messages?page=${page}&size=${size}`,
    ),

  markConversationRead: (conversationId: string) =>
    apiFetch<void>(`${CHAT_API_BASE}/conversations/${encodeURIComponent(conversationId)}/read`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
};
